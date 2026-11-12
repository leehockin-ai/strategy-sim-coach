# All-start confirmation parity

## Cause and correction
The custom Start button opened `ScenarioPreflight` (“Before you start”) immediately. Built-in cards first opened a separate identity dialog; the same preflight was hidden behind its “Enter scenario” submit action. This was a difference in dialog order, not a missing server confirmation.

Built-in `StartDialog` now opens the shared preflight immediately, with its existing name/email fields inside the confirmation form. Only valid form submission via Continue invokes the existing creation action. Back, Close and Escape dismiss it without creating anything. Custom Back still retains its reviewed draft. The synchronous Continue guard and retry behavior remain intact. Resume routes are unchanged and do not import the preflight.

All current creation call sites were traced: built-in starts use this dialog; custom starts use the same preflight. Landing, My sessions and report start links go to Scenarios rather than creating sessions directly.

## Verification
- Signed-in preview at 1280×1800 and 390×844: Student Founder, Distant Sponsor, Solution Factory and Confident Executive each opened Before you start immediately; Enter activation, Back and Escape passed.
- Native invalid-email validation prevented launch. Final runs attempted no creation requests. All session-writing requests were blocked as a safety net throughout verification.
- Custom Start was tested on the actual Scenarios screen with a browser-only fictional draft fixture: dialog, keyboard focus containment, Back preserving the draft and Escape passed on both sizes. Real draft generation did not complete during verification; it is not claimed verified here.
- Screenshots inspected: no horizontal overflow; mobile content and actions visible. No browser page errors in the final runs.
- 351 regression tests passed, 5 opt-in tests skipped. Existing duplicate-Continue and failed-retry tests passed. Preview compilation reported build OK.
- Resume remains a direct existing-session link by source inspection; no existing session was opened or modified during these checks.

No sessions were created, archived, updated or deleted. No schema changes or publishing.