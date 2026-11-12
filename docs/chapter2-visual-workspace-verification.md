# Chapter 2 visual workspace verification

## Delivered
- Existing conversation/composer on the left; read-only Workspace on the right and below on phones. Four accessible tabs: Team work, Business Model Canvas, Value Proposition Canvas, Assumptions Map. View selection never switches the active reference.
- One active link; collapsed Playbooks used contains earlier links/reasons, switch back and add. Same team, transcript, Scope, starting note IDs, message storage and revision chain.
- BMC has nine named blocks; semantic grid on wide screens and vertical readable blocks on narrower screens. VPC separates customer jobs/pains/gains from products/services, pain relievers and gain creators. No inferred value-map classifications; unsupported items remain Other team work / Unmapped.
- Assumptions use importance and evidence only when a team note explicitly states both high/low importance and strong/weak evidence. Other notes remain Unmapped; these are team claims, not verified evidence.
- Small stable origin badges use first-use reference order. Starting notes retain original Scope origin. Each earlier version and latest revision is attributed by exact source message position in the validated switch sequence; old legacy-phase notes show origin unavailable. No persisted notes or historical records are rewritten.
- Existing screenshot attach/paste/preview/remove, send/retry, dictation/read-aloud, stopping, Chapter 3 and assessment logic untouched.

## Actual checks
223 automated tests passed; two existing opt-in real-AI tests skipped. New tests cover original P1 versus P2 revision and P1 return, same note object/ID across views, nine BMC blocks, legacy unknown origin, and explicit two-axis placement with incomplete/risky language staying unmapped. Preview build log reports OK.

Browser: actual CustomerProfileReference, PlaybookSwitcher, TeamWorkspace and TeamWorkingWall rendered in a temporary intercepted page on localhost. Only function boundaries used isolated localStorage adapters and deterministic team speech; no shared database calls. Desktop 1280×1800 and mobile 390×844 passed:
- Playbooks used initially collapsed; add Customer Profile, switch back to original Business Models, reload active state and note history.
- Same S1 note in all four views, original P1 badge, latest P2 revision and original opening history.
- Exact source click focuses the real visible transcript message.
- S4 assumption without axis data remains Unmapped.
- Unsent text and screenshot preview survive a reference change; removal and text send work.
- One transcript, read-aloud toggle and dictation control remain; keyboard arrow navigation changes tabs.
- No horizontal overflow in any mobile view; fixed long switch-event URL wrapping identified by the check.
- No page errors. Desktop/mobile screenshots inspected.

## Limits
This is isolated fixture verification, not hosted signed-in end-to-end proof. No real AI turn, hosted save/reload, screenshot vision, live microphone, physical audio, paid speech playback, retry failure or Chapter 3 assessment journey was rerun for this presentation change. Existing handler/voice regression tests passed. Starter content remains view-only and depends on original saved Scope, as before. Origin attribution assumes the existing ordered message read; no timestamps or data were modified. VPC empty value-map blocks are honest unsupported states, not missing generated content.

No migrations, shared session/database writes, Strategyzer changes or publishing.