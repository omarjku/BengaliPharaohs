"""Case sync endpoints: tier-0 facts in batches, blobs one PUT each, SAAO list + replies."""
import hashlib
import hmac
import os
from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import Session, select

from .db import get_session
from .models import Case, CaseBlob, Reply

router = APIRouter(prefix="/api")



def require_saao(x_saao_token: str | None = Header(default=None)) -> None:
    """Dashboard routes (case list, photos, replies) need the SAAO code from SAAO_TOKEN.
    Farmers' phones never need it: they only upload their own cases. No SAAO_TOKEN set → dashboard is closed."""
    expected = os.getenv("SAAO_TOKEN", "")
    if not expected or not x_saao_token or not hmac.compare_digest(x_saao_token, expected):
        raise HTTPException(401, "SAAO code required")


LIMITS = {"thumb": 64 * 1024, "photo": 1024 * 1024, "voice": 1024 * 1024}


class CaseIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    case_id: UUID
    created_at: datetime
    kind: Literal["leaf", "flood", "drought"]
    upazila: str
    class_: str | None = Field(default=None, alias="class")
    confidence: float | None = None
    taps: dict
    output_code: str
    card: str
    date_used: str
    simulated_date: bool
    consent: bool
    has_thumb: bool
    has_photo: bool
    has_voice: bool


class BatchIn(BaseModel):
    device_id: str = Field(min_length=1, max_length=100)
    cases: list[CaseIn] = Field(max_length=20)  # more than 20 -> 422


class ReplyIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    by: Literal["saao"]


@router.post("/cases/batch")
def cases_batch(batch: BatchIn, session: Session = Depends(get_session)) -> dict:
    accepted: list[str] = []
    rejected: list[dict] = []
    for c in batch.cases:
        cid = str(c.case_id)
        if c.consent is not True:
            rejected.append({"case_id": cid, "reason": "no_consent"})
            continue
        row = Case(
            case_id=cid, device_id=batch.device_id, klass=c.class_,
            **c.model_dump(exclude={"case_id", "class_"}),
        )
        existing = session.get(Case, cid)
        if existing:  # retry: keep the first received_at
            row.received_at = existing.received_at
        session.merge(row)  # merge = insert or update by primary key, so retries are idempotent
        accepted.append(cid)
    session.commit()
    return {"accepted": accepted, "rejected": rejected}


async def _put_blob(kind: str, case_id: UUID, request: Request, session: Session) -> dict:
    limit = LIMITS[kind]
    ctype = request.headers.get("content-type", "").split(";")[0].strip().lower()
    ok = ctype == "image/jpeg" if kind != "voice" else ctype.startswith("audio/")
    if not ok:
        raise HTTPException(415, f"{kind} must be {'audio/*' if kind == 'voice' else 'image/jpeg'}")
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limit:
        raise HTTPException(413, f"{kind} over {limit} bytes")
    body = await request.body()
    if len(body) > limit:
        raise HTTPException(413, f"{kind} over {limit} bytes")
    cid = str(case_id)
    digest = hashlib.sha256(body).hexdigest()
    # No check that the Case exists: blobs may arrive first (flaky network, any order).
    session.merge(CaseBlob(case_id=cid, kind=kind, data=body, sha256=digest, content_type=ctype))
    session.commit()
    return {"case_id": cid, "kind": kind, "bytes": len(body), "sha256": digest}


@router.put("/cases/{case_id}/thumb")
async def put_thumb(case_id: UUID, request: Request, s: Session = Depends(get_session)) -> dict:
    return await _put_blob("thumb", case_id, request, s)


@router.put("/cases/{case_id}/photo")
async def put_photo(case_id: UUID, request: Request, s: Session = Depends(get_session)) -> dict:
    return await _put_blob("photo", case_id, request, s)


@router.put("/cases/{case_id}/voice")
async def put_voice(case_id: UUID, request: Request, s: Session = Depends(get_session)) -> dict:
    return await _put_blob("voice", case_id, request, s)


def _reply_out(r: Reply) -> dict:
    return {"id": r.id, "case_id": r.case_id, "text": r.text, "by": r.by, "created_at": r.created_at}


def _case_out(c: Case, blobs: set[str], reply: Reply | None) -> dict:
    d = c.model_dump(exclude={"klass", "device_id"})
    d["class"] = c.klass
    d["blobs"] = {k: k in blobs for k in LIMITS}
    d["reply"] = _reply_out(reply) if reply else None
    return d


@router.get("/cases")
def list_cases(
    upazila: str | None = None, limit: int = 50, s: Session = Depends(get_session), _: None = Depends(require_saao)
) -> list[dict]:
    q = select(Case).order_by(Case.received_at.desc(), Case.created_at.desc()).limit(min(max(limit, 1), 200))
    if upazila:
        q = q.where(Case.upazila == upazila)
    out = []
    for c in s.exec(q).all():
        blobs = set(s.exec(select(CaseBlob.kind).where(CaseBlob.case_id == c.case_id)).all())
        reply = s.exec(select(Reply).where(Reply.case_id == c.case_id).order_by(Reply.id.desc())).first()
        out.append(_case_out(c, blobs, reply))
    return out


@router.get("/cases/{case_id}/{kind}")
def get_blob(
    case_id: UUID, kind: Literal["thumb", "photo", "voice"], s: Session = Depends(get_session), _: None = Depends(require_saao)
) -> Response:
    b = s.get(CaseBlob, (str(case_id), kind))
    if not b:
        raise HTTPException(404, "no such blob")
    return Response(b.data, media_type=b.content_type)


@router.post("/cases/{case_id}/reply")
def post_reply(case_id: UUID, body: ReplyIn, s: Session = Depends(get_session), _: None = Depends(require_saao)) -> dict:
    if not s.get(Case, str(case_id)):
        raise HTTPException(404, "unknown case")
    r = Reply(case_id=str(case_id), text=body.text, by=body.by)
    s.add(r)
    s.commit()
    s.refresh(r)
    return _reply_out(r)
