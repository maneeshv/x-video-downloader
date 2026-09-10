# 0022. Preserve deployed playback controls
Date: 2026-09-11 | Status: DECIDED

## Context
Deployment preflight recovered Worker `93f3b6c1-be69-4edf-ba36-58d9a70bbdc0`, whose playback changes were absent from every fetched Git branch. The owner requested the Library redesign without losing functionality. Production already records migration `0004_resume.sql` and its nullable INTEGER `resume_ms` column.

## Decision
Recover the live implementation unchanged: explicit playback speed and keyboard controls for all admitted users, owner-only resume persistence through the existing metadata endpoint, metadata-only preload without autoplay, and private immutable video caching. Retain nonnegative safe-integer validation and no viewer writes. Restore the applied migration filename for fresh databases; do not reapply it to production.

## Consequences
The redesign cannot silently remove deployed playback behavior. Source comparison and a runnable regression protect the recovered contract. Revisit only for a separately requested playback change; future deployments must compare their bundle with live source as well as Git ancestry.
