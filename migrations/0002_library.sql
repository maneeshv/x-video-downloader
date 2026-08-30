-- Video library (spec docs/superpowers/specs/2026-08-30-video-library-design.md §3, ADR-0011).
-- Additive only (docs/runbooks/deploy.md): D1 has no down-migrations in this repo.
ALTER TABLE bookmarks ADD COLUMN title TEXT;
ALTER TABLE bookmarks ADD COLUMN description TEXT;
ALTER TABLE bookmarks ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookmarks ADD COLUMN deleted_at TEXT;
