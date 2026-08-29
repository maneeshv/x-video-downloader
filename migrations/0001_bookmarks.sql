CREATE TABLE bookmarks (
  post_id       TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  posted_at     TEXT,
  text          TEXT,
  post_url      TEXT NOT NULL,
  has_video     INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL,
  error         TEXT,
  r2_key        TEXT,
  bytes         INTEGER,
  preview_url   TEXT,
  updated_at    TEXT NOT NULL
);
