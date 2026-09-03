# Library tag picker

Status: PROPOSED  
Date: 2026-09-03  
Selected direction: visual option 3, “Focused tag manager popover”  
Visual reference: [option 3 mock](assets/2026-09-03-library-tag-picker-option-3.png)

## 1. Problem

The live tagging implementation exposes one exact-tag dropdown in the Library and a comma-separated text field on the watch page. It technically stores and searches tags, but it does not make the existing tag vocabulary easy to discover or reuse. The owner should never need to remember tag names, manually reproduce spelling, or manage duplicates.

Tags must behave as a shared, visible vocabulary across the Library and video editor. The same picker model must support choosing existing tags, seeing what is already selected, removing a selection, and creating a new tag only where assignment is editable.

## 2. Goals

- Browse and search all tags currently attached to live Library videos.
- Filter the Library by multiple tags without selecting the same tag twice.
- Assign existing tags to a video without retyping them.
- Create a new tag by typing its name and pressing Enter, then attach it when video details are saved.
- Use the same vocabulary, normalization, limits, and selection language everywhere.
- Preserve tag filters through sorting, pagination, reloads, and watch-page round trips.
- Work fully with pointer, keyboard, touch, and assistive technology.

## 3. Non-goals

- A standalone tag administration page.
- Renaming, merging, recoloring, ordering, or deleting tags globally.
- Bulk-tagging multiple videos.
- Tag groups, nested tags, aliases, or automatic tag suggestions.
- Changing the existing D1 JSON-array storage decision in ADR-0018.
- Making the tags shown on video cards interactive; card chips remain informational and the whole card remains the play target.

## 4. Shared vocabulary and rules

An available tag is a normalized tag attached to at least one downloaded, non-deleted video. A tag detached from its last live video disappears from the available list. No separate empty tag record is retained.

The Store returns each available tag with its live video count. The picker sorts tags alphabetically, case-insensitively. Search narrows this list by case-insensitive substring match without changing the selected set.

Tag identity is case-insensitive: `Design`, `design`, and `DESIGN` are the same tag. An existing canonical display spelling is reused when the tag is selected elsewhere. If legacy rows contain differently-cased versions, the spelling on the live video with the oldest `first_seen_at` wins, with `post_id` as the deterministic tie-breaker. Leading and trailing whitespace is removed. A tag must contain 1–30 characters after trimming; a video may have at most 12 tags. Duplicate values are never stored or rendered.

## 5. Library filtering

### 5.1 Closed state

Replace the live single-tag `<select>` with one button in the existing Library control bar:

- no selection: tag icon + `Tags`;
- selected tags: tag icon + `Tags N`, where `N` is the committed selection count;
- active styling: amber border/text when `N > 0`;
- accessible name: `Filter by tags, N selected`.

The trigger sits alongside Search library, Sort by, Videos per page, and Favourites only. It does not expose selected names in the closed control; the count keeps the toolbar compact.

### 5.2 Open popover

Activating the trigger opens an anchored popover containing, in order:

1. Heading: `Filter by tags`.
2. Search input: `Find a tag`.
3. `Selected (N)` section with one removable chip per draft selection.
4. Scrollable alphabetical list of every available tag matching the search, with its live video count.
5. Hint: `Results must contain all selected tags.`
6. `Clear` and primary `Apply filters` actions.

An unselected list row is clickable. Selecting it adds one chip and immediately changes that row to a checked, disabled state labelled `Selected`. The row cannot add a duplicate. Removing a chip returns its row to the available state. `Clear` removes all draft selections but does not change results until Apply.

Opening the popover copies the committed URL selection into a draft. `Apply filters` commits the draft, closes the popover, resets the Library to page 1, and reloads the server-rendered results. Escape, clicking outside, or pressing the trigger again closes the popover and discards unapplied changes. Reopening starts from the committed selection.

### 5.3 Filter semantics and URL

Multiple tags use AND semantics: each result must contain every selected tag. Tag comparison is exact and case-insensitive; selecting `Design` does not match `Design systems` unless that second tag is independently selected.

The canonical URL uses one `tag` parameter per selected tag, in selection order:

```text
/?tag=Tutorial&tag=Design&sort=oldest&page=2&perPage=20
```

Parsing trims, case-insensitively deduplicates, validates the existing 12/30 limits, and ignores invalid values. Links, page controls, favourite state, watch URLs, and Back to library retain all committed tag parameters. Any filter change resets `page` to 1.

The result summary reads naturally, for example: `18 videos tagged Tutorial + Design.` An empty result uses the existing empty-state treatment and offers `Clear tag filters` while preserving unrelated search/sort/page-size settings.

### 5.4 No available tags

When no live video has a tag, the trigger remains present but disabled with accessible description `No tags yet`. Tags can still be created from a video editor. Once the first tagged video is saved, the trigger becomes available on the next Library render.

## 6. Assigning tags on a video

### 6.1 Field structure

Replace the comma-separated watch-page Tags input with a combobox picker inside the existing metadata form. The field contains:

- one removable chip for each tag currently staged on the video;
- a text input after the chips with placeholder `Add a tag` when empty;
- an anchored suggestion list while focused;
- helper text: `Choose an existing tag or type a new one and press Enter.`

The suggestion list uses the shared alphabetical vocabulary and counts. Tags already staged on this video remain visible but are checked, disabled, and labelled `Added`; they cannot be selected twice.

### 6.2 Selecting an existing tag

Clicking a suggestion or highlighting it and pressing Enter adds its canonical tag as a chip, clears the query, and keeps the picker open for another selection. At 12 staged tags, unselected rows and text creation are disabled and the helper text becomes `Maximum 12 tags.` Removing a chip re-enables selection.

### 6.3 Creating a new tag

When trimmed input has no exact case-insensitive match, the first actionable row reads `Create “{input}”` with the keyboard hint `Enter`. Pressing Enter adds a chip carrying a subtle `New` marker. This only stages the tag; it is not available elsewhere yet.

If the input exactly matches:

- an unselected existing tag, Enter selects that tag instead of creating another;
- a staged tag, no action occurs and the existing chip is briefly emphasized;
- an invalid or overlong value, creation is unavailable and an inline message explains the 30-character limit.

Blank input never creates a tag. On blur, uncommitted input text is discarded; only chips are part of the form draft.

### 6.4 Saving and failure

`Save details` sends the complete staged tag array with title and description through the existing metadata endpoint. On success, new tags become ordinary canonical tags and are available throughout the app; removed tags are detached from the video. On failure, all staged chips and `New` markers remain intact, the form stays editable, and an inline error is announced. Navigating away without saving follows the form’s existing unsaved-change behavior; this feature does not add a new confirmation dialog.

## 7. Keyboard and accessibility contract

- The Library trigger is a button with `aria-haspopup="listbox"` and accurate expanded/selected-count state.
- The search/combobox uses the standard combobox + listbox pattern with `aria-expanded`, `aria-controls`, `aria-activedescendant`, and multiselect semantics.
- Arrow Up/Down moves the active option; Enter selects the active existing option or creates the explicit create row; Escape closes the list/popover; Tab follows visual order.
- Backspace in an empty watch-page input removes the last staged chip. Each chip also has a labelled remove button such as `Remove Design`.
- Checked/disabled status is conveyed through text and semantics, not color alone.
- Opening either surface moves focus to its search/input; closing the Library popover restores focus to the trigger.
- On narrow screens, the Library popover becomes a bottom sheet and the watch suggestion list uses the available viewport height. The selection model and action order do not change.
- Reduced-motion preferences disable chip/popover transitions.

## 8. Data and server changes

No migration is required. Continue using `bookmarks.tags` as a nullable JSON array under ADR-0018.

- Change `LibraryQuery.tag?: string` to `LibraryQuery.tags?: string[]`.
- Parse repeated `tag` query parameters and serialize one parameter per committed selection.
- Apply AND filtering with one exact, case-insensitive `json_each` existence check per selected tag.
- Replace `listTags(): string[]` with an available-tag result containing canonical display value and live-video count.
- Continue including tags in free-text Library search; the dedicated picker complements search rather than removing that behavior.
- Keep `POST /api/videos/:postId` body shape `{ tags?: string[] }`; strengthen canonicalization so persisted casing reuses an existing case-insensitive match.
- Do not introduce a tag table or new dependency.

## 9. Visual contract

The selected mock defines the hierarchy and interaction pattern, not its invented navigation, video titles, counts, page size, or editor-as-modal layout. Production retains the current x-downloader header, toolbar, poster grid, watch-page layout, charcoal surfaces, amber accent, typography, spacing scale, focus rings, and responsive breakpoints.

The tag picker adds only:

- a compact `Tags N` toolbar trigger;
- one anchored, roomy popover on desktop;
- one bottom sheet adaptation on narrow screens;
- removable chips, checkmarks, disabled `Selected`/`Added` rows, and a distinct `Create …` row;
- a `New` marker used only for unsaved watch-page tags.

Avoid always-expanded tag shelves, tag clouds, nested cards, new sidebars, and global tag-management navigation.

## 10. Acceptance criteria

1. Opening the Library tag picker reveals every tag attached to a live Library video without requiring a search query.
2. Selecting a tag creates one chip and makes its list row checked and non-actionable; repeated click/Enter cannot duplicate it.
3. Removing the chip makes the tag selectable again.
4. Draft Library changes do not affect results until Apply; dismissing the popover restores the committed draft on reopen.
5. Applying two tags returns only videos containing both, resets to page 1, and persists both repeated URL parameters through reload, pagination, sorting, favourites, watch, and Back.
6. The watch picker lists the same existing tags and prevents adding a tag already staged on the video.
7. Typing a new valid label and pressing Enter creates one `New` chip; it does not become globally available until Save details succeeds.
8. Typing a differently-cased existing label selects the canonical existing tag instead of creating a duplicate.
9. Save failure preserves staged tags and announces the failure; successful save persists additions/removals and removes `New` markers.
10. The 12-tags-per-video and 30-characters-per-tag limits are enforced in both UI and API.
11. Pointer, touch, and the documented keyboard interactions work; screen readers receive selected, disabled, expanded, result, and error state.
12. Desktop and narrow-screen layouts have no horizontal overflow, clipped actions, or unreachable options with a long tag list.

## 11. Verification plan

- Store tests: canonical counts, case-insensitive identity, AND matching, exact-vs-prefix behavior, empty/deleted tag removal, and pagination counts.
- Route tests: repeated query parsing, limit/deduplication, URL preservation, canonical casing, and metadata validation.
- Render tests: trigger count, chips, selected disabled rows, create row, empty vocabulary, empty results, and escaped tag text.
- Browser tests: pointer and full keyboard flows for Library Apply/discard and watch select/create/remove/save; desktop plus 390×844 viewport; reduced motion; no console errors.
- Production smoke test after an approved deploy: reuse an existing tag, create a new tag, save it, filter by it plus a second tag, open a result, and return with both filters intact.

## 12. Rollout

Implement behind no flag: the current tag storage and API are already live, and the new UI is a compatible replacement. Run the full repository check and browser QA before deployment. No D1 migration is needed. Deploy only after owner approval under ADR-0010.
