# Product: x-downloader

Updated: 2026-08-29 (design phase)

## Problem
The owner bookmarks video posts in the X/Twitter mobile or web app. Those bookmarks are trapped in X: no export, videos can be deleted, and the official API charges for bookmark reads. The owner wants every bookmarked video to land automatically in their own cloud storage without touching anything after bookmarking.

## User
One person: the owner, using their own X account and bookmarks. The project may be open-sourced so others can deploy their own single-user instance. **Multi-tenancy is a non-goal.**

## Core flow
1. Owner bookmarks a video post in X (any client).
2. A scheduled job in the cloud notices the new bookmark.
3. The video file is downloaded to the owner's cloud storage, and the job remembers it so it is never downloaded twice.
4. Owner watches or bulk-downloads the videos later from their storage.

## Constraints (from the owner, 2026-08-29)
- Runs **entirely in the cloud**: scheduling, downloading, storage. No home server, no laptop dependency.
- **Near-zero cost.** Target $0/month on Cloudflare free tiers; storage overage is the accepted, expected expense. Small charges are tolerable; a $100/month X API tier is not.
- Cloudflare stack preferred (owner's belief that it covers scheduling, compute, storage).
- No paid X API. Access to bookmarks is via the owner's own logged-in session (session cookies or headless browser — see the design spec for the decision).
- **No human writes code.** An AI agent maintains the repo across sessions; docs are the agent's memory (`CLAUDE.md`, `docs/STANDARDS.md`).
- Open-source-ready: no secrets in the repo, clone-and-deploy instructions, nothing account-specific hardcoded.

## Non-goals
- Multi-user / SaaS. Design for one account.
- Downloading images, threads, or text — videos only (GIF-as-mp4 included, since X serves them as mp4).
- Transcoding, thumbnails generation, search, tagging, a rich dashboard.
- Automating the X login (username/password/2FA). The owner supplies a session; the tool never logs in.
- Re-hosting or sharing videos publicly.

## Success criteria
- Bookmark a video → it appears in storage within one polling interval, without intervention.
- Zero duplicates; a crashed run never loses or double-stores a video.
- Monthly Cloudflare bill ≈ $0 apart from storage beyond the free 10 GB.
- When the X session expires or X changes its API, the failure is visible (status page / log), and recovery is a documented ≤5-minute runbook (`docs/runbooks/`).
- A fresh agent session can read `CLAUDE.md` + `docs/STATUS.md` and continue work without re-briefing.

## Known risks (accepted by design, tracked in ADRs / QUESTIONS)
- X's terms forbid non-API automated access; the owner's account can be rate-limited, locked, or suspended. Mitigation: low cadence, boring request pattern, optionally a dedicated account. See `docs/research/2026-08-29-persona-security.md`.
- A stored session cookie is password-equivalent. Mitigation: Worker secrets, scoped tokens, 2FA on X, rotation runbook.
- X's internal API shape changes without notice. Mitigation: parser fixture test + "200 but zero parsed" runtime alarm.
