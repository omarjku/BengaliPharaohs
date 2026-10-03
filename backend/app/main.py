"""API. The contract lives in contract/api.md; change both together."""
import json
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402
from sqlmodel import Session, select  # noqa: E402

from .db import engine, get_session, init_db  # noqa: E402
from .llm import provider, stream_text  # noqa: E402
from .models import Run, RunOut, RunRequest  # noqa: E402


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Hack-Nation API", lifespan=lifespan)
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
)


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "provider": provider()}


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
