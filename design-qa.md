# Library tag picker design QA

**Evidence**

- Source visual truth: `docs/superpowers/specs/assets/2026-09-03-library-tag-picker-option-3.png`
- Browser-rendered implementation: `docs/superpowers/specs/assets/2026-09-03-library-tag-picker-implementation-desktop.png`
- Responsive implementation: `docs/superpowers/specs/assets/2026-09-03-library-tag-picker-implementation-mobile.png`
- Full-view side-by-side comparison: `docs/superpowers/specs/assets/2026-09-03-library-tag-picker-comparison.png`
- Source pixels: 1487 × 1058. Desktop implementation pixels/CSS viewport: 1440 × 1024 at 1× density. For the side-by-side comparison the source was proportionally normalized to 1440 × 1024; the implementation remained 1440 × 1024.
- Mobile implementation pixels/CSS viewport: 390 × 844 at 1× density.
- State: dark Library, `Tutorial` committed plus `Design` selected in the draft, tag picker open, available tags and counts visible, both selected rows disabled, Apply action visible—the same two-selection state as the source picker.

**Findings**

- No actionable P0, P1, or P2 differences remain. The implementation preserves the approved picker hierarchy, compact trigger, selected chip, searchable/count-bearing list, disabled selected state, AND copy, and primary Apply action while retaining the production x-downloader shell required by the spec.
- [P3] The mock includes decorative tag glyphs and checkbox marks; the implementation uses the existing product's text-first controls plus explicit `Selected`/`Added` labels and native disabled/selected semantics. This is a small visual simplification, not an interaction or accessibility loss, and avoids introducing an icon dependency for one control.

The five fidelity surfaces were checked explicitly:

- Fonts and typography: the production system stack, hierarchy, weights, line heights, and small-label tracking remain internally consistent; the mock's invented typeface is not authoritative under spec §9.
- Spacing and layout rhythm: the desktop trigger/popover alignment, row density, chips, footer actions, radii, and elevation match the selected direction. The 390 × 844 bottom sheet now keeps every action reachable with no horizontal overflow.
- Colors and visual tokens: the existing charcoal surfaces, border scale, amber active/focus/primary states, muted metadata, and contrast are preserved.
- Image quality and asset fidelity: production poster treatment remains sharp and uncropped beyond its existing 16:9 treatment. The mock's invented videos are explicitly non-authoritative; the QA fixture used real remote poster images only to exercise the production grid.
- Copy and content: `Filter by tags`, `Find a tag`, `Selected (N)`, `Selected`/`Added`, the AND hint, `Clear`, `Apply filters`, create-on-Enter guidance, and `New` staging language match the approved contract.

**Open Questions**

- None. The mock's navigation, card content/counts, and modal editor were intentionally excluded by approved spec §9.

**Focused Region Comparison**

No separate crop was needed: both open picker panels occupy large, legible regions in the native-density 2880 × 1024 side-by-side comparison. The desktop implementation screenshot additionally preserves the panel at native 1440 × 1024 pixels for close inspection.

**Comparison History**

1. Initial responsive pass found one P2: at 390 × 844 the bottom sheet's action row extended 34 px below the viewport. Browser measurement showed the panel bottom at 878 px in an 844 px viewport because `animation-fill-mode: both` kept a transformed `main` ancestor and changed the containing block for `position: fixed`.
2. Fix: removed the persistent animation fill mode from `main`, retaining the brief entrance animation without leaving a transformed containing block.
3. Post-fix evidence: `docs/superpowers/specs/assets/2026-09-03-library-tag-picker-implementation-mobile.png`; browser measurement is now exactly bottom 844 px in an 844 px viewport, with Clear and Apply fully visible. Desktop was recaptured after the fix and the full-view comparison regenerated. No console warnings or errors remained.

**Primary Interactions Tested**

- Pointer selection disables a selected tag; Apply commits repeated `tag` parameters and the result uses AND semantics.
- Arrow Down + Enter selects an available tag; Escape closes the popover and discards the unapplied draft on reopen.
- The watch combobox exposes the same vocabulary, disables tags already staged, creates a `New` chip on Enter, and removes the marker after a successful Save.
- Desktop 1440 × 1024 and mobile 390 × 844 were exercised; browser console warnings/errors were checked after each primary state.
- Residual test gap: the browser runtime was not used to emulate `prefers-reduced-motion`; the stylesheet's reduced-motion rule is covered by source inspection.

**Implementation Checklist**

- [x] Desktop picker hierarchy and state match the approved direction.
- [x] Selected rows are non-actionable and duplicates are prevented.
- [x] Apply/discard and keyboard paths work.
- [x] Watch-page select/create/save path works.
- [x] Mobile bottom sheet has reachable actions and no horizontal overflow.
- [x] Console is clean in tested states.

**Follow-up Polish**

- Consider adding a shared icon library only if the broader product adopts icons; do not add one solely for the tag trigger.

final result: passed
