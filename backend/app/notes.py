"""Voice questions ("notes"): the farmer records anything about the farm offline; when the phone syncs,
the server transcribes the audio and an LLM writes a short answer. The answer goes back as a Reply with by="ai"
through the same case_replies pack part the SAAO's replies use, and the SAAO sees the note + transcript too.

Runs as a FastAPI background task after the facts or the voice file arrive (whichever comes last).
No OPENAI_API_KEY (needed for Bangla speech-to-text) -> nothing happens and the SAAO answers by hand.
"""
import io
import logging
import os
import threading
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, func, select

from .db import engine
from .models import Case, CaseBlob, Reply

log = logging.getLogger(__name__)
_lock = threading.Lock()  # facts and audio can land at the same moment: one answer per note, not two

SYSTEM = (
    "You help a smallholder rice farmer in Bangladesh. They recorded a voice question; you get the transcript, "
    "which may contain speech-recognition mistakes. Answer in the language of the transcript (usually Bangla), "
    "in at most 3 short, simple sentences a farmer can act on. Rules: never name a pesticide, product or dose; "
    "never claim certainty; if it is about disease, spraying, money, or you are not sure what they mean, say to "
    "show the field to the local agriculture officer (SAAO) or call 16123. Do not invent facts about their field."
)
EXT = {"audio/webm": "webm", "audio/mp4": "mp4", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/wav": "wav"}


def transcribe(audio: bytes, content_type: str) -> str:
    from openai import OpenAI

    f = io.BytesIO(audio)
    f.name = f"note.{EXT.get(content_type, 'webm')}"  # the API picks the decoder from the file name
    r = OpenAI(timeout=60, max_retries=1).audio.transcriptions.create(
        model=os.getenv("STT_MODEL", "gpt-4o-transcribe"), file=f, language="bn"
    )
    return r.text.strip()


def answer(transcript: str) -> str:
    if os.getenv("ANTHROPIC_API_KEY"):
        from anthropic import Anthropic

        m = Anthropic(timeout=30, max_retries=1).messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5"), max_tokens=400, system=SYSTEM,
            messages=[{"role": "user", "content": transcript}],
        )
        return "".join(b.text for b in m.content if b.type == "text").strip()
    from openai import OpenAI

    r = OpenAI(timeout=30, max_retries=1).chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        messages=[{"role": "system", "content": SYSTEM}, {"role": "user", "content": transcript}],
    )
    return (r.choices[0].message.content or "").strip()


_busy: set[str] = set()  # notes being answered right now; the lock guards only this set, never a network call
DAILY_LIMIT = int(os.getenv("NOTE_DAILY_LIMIT", "200"))  # the upload API is open, so cap what strangers can spend
DEVICE_DAILY_LIMIT = int(os.getenv("NOTE_DEVICE_DAILY_LIMIT", "10"))


def _over_limit(s: Session, device_id: str) -> bool:
    since = datetime.now(timezone.utc) - timedelta(days=1)
    q = select(func.count()).select_from(Reply).where(Reply.by == "ai", Reply.created_at >= since)
    total = s.exec(q).one()
    mine = s.exec(q.join(Case, Case.case_id == Reply.case_id).where(Case.device_id == device_id)).one()
    return total >= DAILY_LIMIT or mine >= DEVICE_DAILY_LIMIT


def answer_note(case_id: str) -> None:
    """Idempotent: does nothing until both the note facts and its audio are here, or once an AI reply exists."""
    if not os.getenv("OPENAI_API_KEY"):
        return
    with _lock:
        if case_id in _busy:
            return
        _busy.add(case_id)
    try:
        with Session(engine) as s:
            case = s.get(Case, case_id)
            voice = s.get(CaseBlob, (case_id, "voice"))
            done = s.exec(select(Reply).where(Reply.case_id == case_id, Reply.by == "ai")).first()
            if not case or case.kind != "note" or not voice or done or _over_limit(s, case.device_id):
                return  # over the cap: the SAAO still gets the recording and answers by hand
            audio, ctype = voice.data, voice.content_type
        try:  # no DB session or lock held during the slow calls
            heard = transcribe(audio, ctype)
            text = answer(heard) if heard else ""
        except Exception:  # provider down / bad audio: the SAAO still has the recording
            log.exception("note %s: AI answer failed", case_id)
            return
        with Session(engine) as s:
            case = s.get(Case, case_id)
            case.taps = {**case.taps, "transcript": heard}  # new dict so SQLAlchemy sees the JSON change
            s.add(case)
            if text:
                s.add(Reply(case_id=case_id, text=f"“{heard}”\n{text}"[:1500], by="ai"))
            s.commit()
    finally:
        with _lock:
            _busy.discard(case_id)


def schedule(bg, cases) -> None:
    """Queue an answer for every voice-question case just stored (the audio may already be here)."""
    for c in cases:
        if c.kind == "note":
            bg.add_task(answer_note, str(c.case_id))
