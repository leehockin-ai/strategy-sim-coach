# Chapter 2 transcript scroll

- Existing full transcript is inside a labelled, keyboard-focusable native scrolling region, capped at the smaller of 25rem (roughly twenty text lines) and 55svh. Composer and Workspace remain outside it.
- Initial session open follows latest. New turns follow only when within 64px of the bottom or after a successful coach send. Older-message reading stays in place. Failed sends retain the existing draft/retry behavior.
- Source clicks focus the exact message and center it inside the pane; historical opening/revision links remain intact. No outer-page scroll is triggered by source navigation.

## Checks
Isolated actual Chapter 2 browser screen with 45+ synthetic messages and localStorage adapters passed desktop 1280×1800 and mobile 390×844: initial latest, native overflow, complete history, reading-position preservation during appended turns, near-bottom follow, successful-send follow, current and original opening source focus, keyboard pane focus, composer/Workspace outside, attachment/read-aloud controls present, and no horizontal overflow or page errors. Screenshots inspected.

225 automated tests passed, two existing opt-in live tests skipped. Preview build log reports OK. No real AI or hosted persistence was tested; no shared writes, session edits, schema changes or publishing.