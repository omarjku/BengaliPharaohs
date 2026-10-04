from datetime import datetime, timezone

from sqlalchemy import JSON, Column, LargeBinary
from sqlmodel import Field, SQLModel


class Run(SQLModel, table=True):
    """One request through the demo pipeline. Rename/extend once the challenge is known."""

    id: int | None = Field(default=None, primary_key=True)
    input: str
    output: str = ""
    provider: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RunRequest(SQLModel):
    input: str = Field(min_length=1, max_length=8000)


class RunOut(SQLModel):
    id: int
    input: str
    output: str
    provider: str
    created_at: datetime


# ---- Sync tables (docs/sync-plan.md §5) ----------------------------------------------------
# A table = one class with table=True. primary_key=True makes the column unique, so
# session.merge() can "upsert" (insert, or update if the key already exists).
class Case(SQLModel, table=True):
    """The facts of one shared case (tier 0). case_id is made by the phone, so a retry is harmless."""

    case_id: str = Field(primary_key=True)
    device_id: str = Field(index=True)  # anonymous; used to give each phone only its own replies
    created_at: datetime
    kind: str  # leaf | flood | drought
    upazila: str = Field(index=True)
    klass: str | None = None  # the API calls this "class" (a Python keyword)
    confidence: float | None = None
    taps: dict = Field(default_factory=dict, sa_column=Column(JSON))  # stored as a JSON text column
    output_code: str
    card: str
    date_used: str
    simulated_date: bool
    consent: bool
    has_thumb: bool = False  # what the phone says it will send; real presence is in CaseBlob
    has_photo: bool = False
    has_voice: bool = False
    # indexed: the SAAO list orders by this (newest first) with a LIMIT
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)


class CaseBlob(SQLModel, table=True):
    """A thumb/photo/voice file. Keyed by (case_id, kind), no foreign key: it may arrive before its Case."""

    case_id: str = Field(primary_key=True)
    kind: str = Field(primary_key=True)  # thumb | photo | voice
    data: bytes = Field(sa_column=Column(LargeBinary))
    sha256: str
    content_type: str
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Reply(SQLModel, table=True):
    """A SAAO's short answer to a case. Several replies per case are allowed; the newest is shown."""

    id: int | None = Field(default=None, primary_key=True)
    case_id: str = Field(index=True)
    text: str
    by: str = "saao"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
