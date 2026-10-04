"""API. The contract lives in contract/api.md; change both together."""
import json
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from datetime import datetime, timezone  # noqa: E402

from fastapi import Depends, FastAPI, HTTPException, Response  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.middleware.gzip import GZipMiddleware  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402
from sqlmodel import Session, select  # noqa: E402

from .db import engine, get_session, init_db  # noqa: E402
from . import pack, sync  # noqa: E402
from .llm import provider, stream_text  # noqa: E402
from .models import Run, RunOut, RunRequest  # noqa: E402


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Hack-Nation API", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip().rstrip("/")
        for o in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(",")
        if o.strip()
    ],
    allow_origin_regex=os.getenv("FRONTEND_ORIGIN_REGEX") or None,  # e.g. https://.*\.vercel\.app
    allow_methods=["*"],
    allow_headers=["*"],
    # Without this the browser hides X-Health/ETag from the cross-origin app (Vercel -> Railway): the phone then
    # thinks every connection is a captive portal and never syncs.
    expose_headers=["X-Health", "ETag", "Retry-After"],
)


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


app.include_router(sync.router)
app.include_router(pack.router)


@app.get("/api/health")
def health(response: Response) -> dict:
    # no-store + X-Health let the phone tell a real answer from a captive-portal page.
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Health"] = "1"
    return {"ok": True, "provider": provider()}


class BurstIn(BaseModel):
    device_id: str = Field(min_length=1, max_length=100)
    upazila: str | None = None
    pack_versions: dict[str, str] = {}
    cases: list[sync.CaseIn] = Field(default=[], max_length=20)


@app.post("/api/burst")
def burst(req: BurstIn, session: Session = Depends(get_session)) -> dict:
    """ONE round trip for a short connection window: store the farmer's cases AND return the pack parts that
    changed. Cases are saved first and never lost if the pack part fails (unknown upazila -> pack null)."""
    accepted, rejected = sync.store_cases(session, req.device_id, req.cases)
    pack_out = None
    if req.upazila:
        try:
            pack_out = pack.changed_parts(session, req.upazila, req.device_id, req.pack_versions)
        except HTTPException:
            pack_out = None
    return {"accepted": accepted, "rejected": rejected, "pack": pack_out, "server_time": datetime.now(timezone.utc).isoformat()}


@app.get("/api/probe.bin")
def probe() -> Response:
    """32 KB of random bytes (incompressible) so the phone can measure real throughput."""
    return Response(os.urandom(32768), media_type="application/octet-stream", headers={"Cache-Control": "no-store"})


@app.post("/api/run")
async def run(req: RunRequest) -> StreamingResponse:
    """Streams server-sent events: `token` {text}, then `done` {id}, or `error` {message}."""

    async def gen():
        parts: list[str] = []
        try:
            async for piece in stream_text(req.input):
                parts.append(piece)
                yield sse("token", {"text": piece})
            with Session(engine) as s:
                r = Run(input=req.input, output="".join(parts), provider=provider())
                s.add(r)
                s.commit()
                s.refresh(r)
                yield sse("done", {"id": r.id})
        except Exception as e:  # surface failures to the UI instead of a silent hang
            yield sse("error", {"message": str(e)})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/runs", response_model=list[RunOut])
def runs(session: Session = Depends(get_session), limit: int = 20) -> list[Run]:
    return list(session.exec(select(Run).order_by(Run.id.desc()).limit(limit)).all())
