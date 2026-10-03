from datetime import datetime, timezone

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
