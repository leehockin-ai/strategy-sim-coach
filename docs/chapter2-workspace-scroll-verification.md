# Chapter 2 Workspace independent scrolling

## Narrow change
The existing normal Chapter 2 TeamWorkingWall view now has a labelled, keyboard-focusable native Workspace assets region capped at min(25rem, 55svh). Heading, view tabs and revision selector are outside it. There are no manual asset-creation controls in this surface: assets continue to come from the existing attributed team speech/extraction path through the unchanged composer.

All notes, canvas sections, origin badges, source links and expandable revision histories remain available inside the pane. Legacy wall surfaces without the workspace view prop retain their prior unbounded presentation.

The existing near-bottom helper is reused. Initial grids remain at their top. A genuinely new note ID is revealed only while following latest, by scrolling its actual position inside the pane rather than blindly scrolling a BMC/VPC/grid to the bottom. Reading older notes, changing historical snapshots and editing existing notes do not trigger follow. No tab changes or focus stealing occur. View switches reset to a readable top rather than jumping to latest.

## Verification
- 226 automated tests passed; two existing opt-in live tests skipped. New regression verifies additions versus initial grids, existing-ID revisions, non-following readers and historical snapshots.
- Isolated actual Chapter 2 browser components with deterministic localStorage message adapters: long board (14 initial notes), full note count, bounded native scrolling, tabs/heading/revision selector outside the pane, reading position preserved during append, newly added note revealed while following, exact source focus in the independent transcript, and historical snapshot append preservation.
- BMC-specific check added a key-partner note near the top while following at the bottom: the new note itself was revealed without scrolling the canvas to its bottom or changing tabs.
- Desktop 1280×1800 and mobile 390×844; all four tabs retained bounded scrolling and no horizontal overflow; keyboard pane focus/native scrolling checked. Composer, attachment and read-aloud controls remained present. No page errors. Screenshots inspected.
- Preview build log: OK.

No shared database/session writes, schema changes, Strategyzer changes or publishing. Hosted persistence, real AI, screenshot vision and physical voice were not rerun for this presentation-only change. Multiple simultaneous additions reveal the first new asset in the active view's display order, not a fabricated chronological grid ordering.