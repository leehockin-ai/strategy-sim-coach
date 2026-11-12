# New-scenario preflight — preview only

One shared accessible “Before you start” dialog precedes explicit creation:

| Entry | Verified with isolated screen mocks |
| --- | --- |
| All four seeded scenario forms | Details → preflight → Continue → existing create action |
| Available private custom practice | Editable draft → preflight → Continue → existing idempotent Start |
| Custom capability unavailable | Existing disabled Start remains fail-closed |
| Home / My sessions new-scenario links | Route to the same Scenarios forms (source inspection) |
| Existing session resume | Unchanged route; no preflight import or interception (source inspection and mocked resume control) |

Styled actual-component browser checks at 1280 × 1800 and 390 × 844 passed:
no creation before Continue; Back/Escape retained candidate details and custom
draft edits; exact external Library link with separate tab; keyboard focus
remained inside the dialog; failed starts retained input for retry; repeated
Continue clicks made one start per attempt. No horizontal overflow or browser
page errors. Mutual-exclusive seeded dialogs avoid overlapping modal lifecycles.

No Library access verification, required playbook choice, guessed Recommender
URL, database/schema changes, email changes or new credentials. No new resume
gates. Custom request identity and all existing server ownership checks remain
unchanged. Seeded creation still has no durable server idempotency key: the new
synchronous guard prevents rapid-click duplicates, but cannot guarantee dedupe
across separate tabs or an ambiguous network retry. That existing boundary was
not redesigned.

Browser calls and navigation were mocked; no real sessions were created or
external site opened. Hosted custom storage remains setup-blocked and was not
enabled. No publishing. Harness/scripts/screenshots are temporary, not app routes.

Final checks: 334 tests passed, 5 opt-in live tests skipped; latest preview build
reports build OK. All ten seeded/custom desktop/mobile browser cases passed.