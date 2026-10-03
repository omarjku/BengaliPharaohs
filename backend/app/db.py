"""SQLite via SQLModel. No database server.

The four things to know:
- a table is a class with `table=True` (see models.py)
- the engine points at the file (DATABASE_URL)
- a Session is one unit of work: add(), commit(), refresh()
- select(Model).where(...) builds a query; session.exec(query).all() runs it
"""
import os
from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)


def init_db() -> None:
    from . import models  # noqa: F401  (registers tables)

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
