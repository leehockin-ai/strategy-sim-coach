# Private custom practice launch — preview implementation

## Available now
- Authenticated intake and editable draft remain in the existing Scenarios screen. Start is enabled only when the installed private-schema capability returns version 1; missing schema fails closed with the draft retained.
- Explicit Start uses an owner-authenticated RPC, stable request UUID, transaction lock and unique owner/request index. The reviewed client-visible scenario and distinct roster are frozen on the ordinary session, not inserted in the catalog. Reusing a request with changed content is rejected.
- The ordinary session route and its scoping, stakeholder, Approach, Chapter 2 team, playbook/board, screenshot/voice/text, Chapter 3 and resumable assessment consumers read the frozen scenario projection. No second coaching engine or separate practice workspace was added.
- Custom report labels are practice-only; certification submission, reviewer by-ID access, reviewer decision and queue are excluded server-side. Program rollups and assignment joins exclude null catalog identities. Database guards additionally deny assignment, certification promotion/submission and human-review fields for custom sessions.
- Three independent server hooks exist: custom practice launch, full AI assessment, formal certification assessment. They currently preserve authenticated access with existing ownership/role checks. No entitlement service was found; no payment, prices, checkout or paid gating was added.

## Storage and audit
`docs/unapplied/private-practice-launch.sql` is unapplied source, outside migration directories. It adds the private snapshot/request to sessions and permits a null catalog ID only for a valid private identity. No new broadly readable tables, raw uploads or private catalog rows.

The schema includes restrictive policies intersecting existing owner/reviewer policies on sessions, messages, evaluations, Scope revisions/submissions, hidden state and activity run/event/artifact/connection paths. Owners cannot read hidden simulator state; reviewers cannot read another owner's private practice even if they have a permissive reviewer policy. Server-only evaluation jobs remain inaccessible directly. Private sessions use normal transcript work, not external activity runs.

Audit covered simulator reads/writes/list/report, evaluation ownership/preparation/start/advance/reviewer actions, program rollups, assignment list/resume paths, public catalog reads, Chapter 3, activity runtime and playbook application ownership. Existing standardized policies and human decisions remain unchanged. Future certification-count consumers must use the standardized session identity predicate, not a raw owner session count.

## Actual checks
- **275 tests passed; five opt-in live tests skipped** in the final suite. Includes four actual disposable PostgreSQL tests using PGlite: schema execution, owner-bound/idempotent Start, immutable snapshot, no catalog insertion, cross-owner session/message/Scope/report denial despite permissive reviewer access, write denial, hidden state denial, certification/assignment/review rejection, new roster initialization and standardized reviewer compatibility.
- Ordinary actual-screen browser harness at localhost used temporary sessionStorage adapters, not hosted persistence. Confirmed synthetic intake/edit/explicit Start into the existing route, real AI scoping response, saved Scope, Approach submission, normal Chapter 2 real AI speech, source-linked notes and reload, screenshot/read-aloud controls, reasoned move-on, Chapter 3 interpretation and sustain-value entry, and report generation progress.
- **The final real-AI assessment/report run was interrupted during generation by execution cancellation. No completed nine-score report, report reload, mobile report, or end-to-end hosted journey is claimed.** The same nine-section evaluator wiring passes regressions, but real custom assessment completion remains to be observed.
- Browser evidence viewed: Scope, Chapter 2, Chapter 3 and generating screenshots under `/tmp/browser/private-launch/`. Browser runs through Chapter 2 had no page errors. Dictation hardware, paid speech output and a fresh image turn were not retested.
- Latest preview build log: build OK. No shared database migrations/writes, real session edits, email sends, credentials/settings changes, Strategyzer changes or publishing.

## Exact hosted-preview enablement prerequisites
1. Provision an isolated backend/draft. Current project context identifies one shared preview/published backend; no isolated managed database was available or modified. Local PGlite is disposable validation only, not the hosted backend.
2. Apply **only** `docs/unapplied/private-practice-launch.sql` through the supported migration tool on that isolated backend. Do not apply the earlier combined mail/draft-table design: it is superseded for practice, and email is outside this request. The scenario_id nullability relaxation is required for private IDs and must be explicitly allowed by migration permissions.
3. Regenerate generated database types; verify all existing policies/triggers alongside these restrictive guards on the isolated stack. Install capability last, as in the SQL; use one atomic migration so partial installation never advertises launch.
4. Verify signed-in capability, Start double-click/retry/conflict, owner save/reload, a second-owner/reviewer denial, original preloaded scenarios and the full normal browser journey through persisted nine-dimension assessment/report and queue/count exclusion. This live validation is required before describing hosted launch as enabled.
5. No email or payment setup is a prerequisite for practice. Those remain unconfigured/unchanged.
