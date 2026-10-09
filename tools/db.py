"""Shared read-only database connection for Brightpath tooling.

Reads DATABASE_URL from the project .env (never copy secrets elsewhere).
All scripts in tools/ must only SELECT — writes go through the app's
validated Server Actions.
"""

import os
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# libpq options psycopg2 actually accepts; Supabase appends Prisma-only flags
# like ?pgbouncer=true which must be stripped.
ALLOWED_PARAMS = {"sslmode", "connect_timeout", "application_name"}


def clean_url(url: str) -> str:
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query) if k in ALLOWED_PARAMS]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), ""))


def get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL is missing from .env")
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://") :]
    return create_engine(clean_url(url), pool_pre_ping=True)
