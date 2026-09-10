# 0021. Cinematic Library navigation and static icons

Date: 2026-09-11 | Status: DECIDED

## Context
The owner selected the cinematic Library preview. It moves favourites into navigation and uses five small line icons. Existing Library state is canonical in URLs (ADR-0016).

## Decision
Keep Library and Favourites as links to the existing route, preserving search, tags, sort, and page size while resetting page. Scope the desktop rail to the Library and adapt it into top navigation on small screens. Keep Watch and Stats layouts and all existing server behavior.

Vendor only the youtube, heart, bar-chart-2, log-out, and search SVG shapes from [Feather 4.29.2](https://github.com/feathericons/feather/tree/v4.29.2/icons), with its MIT license in THIRD_PARTY_NOTICES.md. Use static trusted strings in the existing renderer and aria-hidden icons alongside text. This introduces no npm dependency, icon runtime, external asset request, or new route.

## Consequences
The selected design remains cheap to serve and preserves the complete current feature set. Updating icons requires manually replacing the small vetted subset. Revisit if a broader interface needs enough icons to justify a build-time package.
