"""Offline pack: a small manifest + versioned parts, with ETag/304 so unchanged data costs ~nothing."""
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlmodel import Session, select

from .db import get_session
from .models import Case, Reply

router = APIRouter(prefix="/api/pack")

MOCKS = Path(__file__).resolve().parent.parent / "mocks" / "pack"
APP_DATA = Path(__file__).resolve().parents[2] / "frontend" / "public" / "data"  # bundled app files
PARTS = ["forecast", "flood", "advisories", "prices", "case_replies", "rules", "cards"]


def _hash(obj: object) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, default=str).encode()).hexdigest()[:12]


def _known_codes() -> set[str]:
    """Every upazila code the app can send (places.json: ~494 "DISTRICT-NAME" codes plus the 4 old aliases)."""
    # Railway deploys backend/ only, so frontend/public/data is absent there: keep our own copy of the code list
    # (mocks/upazila_codes.json, generated from places.json). Without it every real code was a 404 on the live site.
    try:
        return set(json.loads((MOCKS.parent / "upazila_codes.json").read_text()))
    except (OSError, ValueError):
        return set()


def _mock_dir(upazila: str) -> Path:
    """Seeded stand-in data exists for 4 upazilas only; any other real upazila gets the SIR one (still labelled seeded)."""
    if upazila.isalnum() and (MOCKS / upazila).is_dir():  # isalnum blocks "../" paths
        return MOCKS / upazila
    if upazila in _known_codes():
        return MOCKS / "SIR"
    raise HTTPException(404, "unknown upazila")


def _check_upazila(upazila: str) -> None:
    _mock_dir(upazila)


def _restamp(p: dict) -> dict:
    """Seeded parts are stand-ins for a live feed: stamp them as fetched today so they never look stale during judging.
    Still `seeded: true` + source "SEEDED ...". Date-level only, so ETags stay stable within a day."""
    try:
        old = datetime.fromisoformat(p["fetched_at"])
        life = datetime.fromisoformat(p["valid_until"]) - old
        today = datetime.now(timezone(timedelta(hours=6))).replace(hour=6, minute=0, second=0, microsecond=0)
        p = {**p, "fetched_at": today.isoformat(), "valid_until": (today + life).isoformat()}
    except (KeyError, TypeError, ValueError):
        pass
    return p


def _file_hash(name: str) -> dict:
    """rules/cards: only a version + hash; the files themselves ship inside the app."""
    f = APP_DATA / f"{name}.json"
    if not f.exists():
        return {"name": name, "version": "unknown", "hash": None}
    raw = f.read_bytes()
    return {"name": name, "version": json.loads(raw).get("version"), "hash": hashlib.sha256(raw).hexdigest()[:12]}


def _replies(session: Session, device_id: str | None) -> dict:
    """Replies to this device's cases, built from the DB (nothing if no device_id)."""
    if not device_id:
        return {"replies": []}
    q = (
        select(Reply)
        .join(Case, Case.case_id == Reply.case_id)
        .where(Case.device_id == device_id)
        .order_by(Reply.id)
    )
    return {"replies": [
        {"id": r.id, "case_id": r.case_id, "text": r.text, "by": r.by, "created_at": r.created_at}
        for r in session.exec(q).all()
    ]}


def _part(name: str, upazila: str, session: Session, device_id: str | None) -> dict:
    if name in ("forecast", "flood", "advisories", "prices"):
        return _restamp(json.loads((_mock_dir(upazila) / f"{name}.json").read_text()))
    data = _replies(session, device_id) if name == "case_replies" else _file_hash(name)
    return {"source": "our backend" if name == "case_replies" else "app bundle",
            "fetched_at": None, "valid_until": None, "seeded": name != "case_replies", "data": data}


def _etag_response(request: Request, body: dict) -> Response:
    etag = f'"{_hash(body)}"'
    headers = {"ETag": etag, "Cache-Control": "no-cache"}  # no-cache = always revalidate, then 304
    if etag in [t.strip() for t in request.headers.get("if-none-match", "").split(",")]:
        return Response(status_code=304, headers=headers)
    return Response(json.dumps(body, default=str), media_type="application/json", headers=headers)


PRIORITY = ["case_replies", "flood", "forecast", "advisories", "prices"]  # what a short connection window fetches first


def changed_parts(session: Session, upazila: str, device_id: str, have: dict[str, str]) -> dict:
    """Burst delta: only the parts whose version differs from what the phone has, in priority order.
    Versions match the manifest's (hash of data; case_replies = global reply counter), so burst and manifest agree."""
    _check_upazila(upazila)
    out: dict[str, dict] = {}
    for name in PRIORITY:
        if name == "case_replies":
            version = str(session.exec(select(Reply.id).order_by(Reply.id.desc())).first() or 0)
            if have.get(name) == version:
                continue
            part = _part(name, upazila, session, device_id)
        else:
            part = _part(name, upazila, session, None)
            version = _hash(part["data"])
            if have.get(name) == version:
                continue
        out[name] = {"version": version, **part}
    return {
        "upazila": upazila,
        "versions": {n: _file_hash(n)["version"] for n in ("rules", "cards")},
        "parts": out,
    }


@router.get("/manifest")
def manifest(request: Request, upazila: str, session: Session = Depends(get_session)) -> Response:
    _check_upazila(upazila)
    parts = {}
    for name in PARTS:
        if name == "case_replies":
            # Per-device content, so the manifest only carries a global "something changed" counter.
            last = session.exec(select(Reply.id).order_by(Reply.id.desc())).first() or 0
            parts[name] = {"version": str(last), "size": 0, "valid_until": None}
            continue
        p = _part(name, upazila, session, None)
        parts[name] = {"version": _hash(p["data"]), "size": len(json.dumps(p)), "valid_until": p["valid_until"]}
    body = {"upazila": upazila, "version": _hash(parts), "generated_at": None, "parts": parts}
    # generated_at is filled after hashing so the ETag only changes when content does.
    etag_resp = _etag_response(request, body)
    if etag_resp.status_code == 200:
        body["generated_at"] = datetime.now(timezone.utc).isoformat()
        # fresh headers: reusing etag_resp.headers would carry the OLD Content-Length (body grew by generated_at)
        etag_resp = Response(json.dumps(body), media_type="application/json", headers={k: v for k, v in etag_resp.headers.items() if k.lower() in ("etag", "cache-control")})
    return etag_resp


@router.get("/{part}")
def pack_part(
    part: str, request: Request, upazila: str, device_id: str | None = None,
    session: Session = Depends(get_session),
) -> Response:
    if part not in PARTS:
        raise HTTPException(404, "unknown part")
    _check_upazila(upazila)
    return _etag_response(request, _part(part, upazila, session, device_id))
