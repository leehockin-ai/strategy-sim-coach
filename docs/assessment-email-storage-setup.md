# Assessment emails and private staging storage

## Confirmed setup status

- Built-in email status: **no sender domain configured**. Do not call infrastructure/scaffold setup without a configured domain. No domain, DNS, provider, auth or secret change made; no mail sent.
- Lovable Cloud health: auth and database responding. Main preview and published app still share the existing backend. No shared migration, bucket or data writes made.
- Supported draft tool successfully created **Assessment email and private storage staging**. A subsequent supported list confirmed **its own test database**, isolated from live data, not the shared-backend fallback. No prompt ran and no schema was applied there. No purchase or payment confirmation appeared; ongoing Cloud/AI usage is not guaranteed free and billing entitlements were not independently verified.
- The draft starts from the last saved main version, so it does **not yet include this turn's email preparation**. Main preview code changes are explicitly authorized; do not install migrations from this main chat.

## Configured in preview code, not enabled sending

- Supported email packages installed, React Email assessment-ready template registered, white body and existing ink/button styling, no scores/report content. Framework entity decoder pin/aliases added.
- Same new-persisted-assessment boundary for all four scenarios and private practice. Its default remains honestly **unconfigured**. Report reads and old assessment retries create no new notice.
- Prepared dispatcher posts only to `/lovable/email/transactional/send`; no direct provider API. Payload is template name, confirmed owner address, event-derived idempotency key and report-link/status props. No candidate email, custom recipient, rubric, score or report body.
- Report origin is deployment-controlled and HTTPS-allowlisted; browser origin/Host cannot override it. Report remains signed-in and owner-authorized. Pending human review is stated only when submission exists and no human decision exists, not simply because AI generation completed.
- Staged new-insert-only outbox captures confirmed auth owner transactionally, freezes recipient, revalidates owner/address/status on claim, and provides service-only exclusive lease/token-CAS, bounded attempts/TTL and Retry-After. No backfill. Email failure cannot change saved assessments.
- Production enablement is deliberately absent: sender/scaffold constants, service credential injection and actual scaffold response contract are unknown until approved setup. No hand-written generic send route or queue infrastructure created. Dispatcher waking/recovery and queue-level deduplication require isolated verification, including crash after queue acceptance but before settle. Thus durable end-to-end delivery is **not claimed**.

## Lee's sender setup screen

Use the chat **Set up email domain** button. Enter/select a **real domain you own** for the sender (for example a domain or notify subdomain); choose it yourself. No domain was chosen on your behalf. There is no free/shared Lovable app-email domain.

The dialog supplies the exact required domain/delegation records. See **More → Emails → Domain settings** for exact values and verification status. No DNS record values are guessed here; DNS edits need your direction. Do not paste API keys into chat. Emails cannot send until the sender is verified.

Because shared infrastructure writes remain forbidden, complete operational sender/infrastructure setup **in the isolated staging draft only after its isolated status is checked again**. If domain setup would alter shared configuration, stop for Lee's approval. After domain configuration, run the supported built-in infrastructure then scaffold tools in that surface; these create queues/cron/RPCs and standard send/preview/unsubscribe/suppression routes. Preserve template registration, required unsubscribe footer, suppression and `/lovable/*` router/middleware exemptions. Create the branded unsubscribe page at the path returned by scaffold. No real sends until separately authorized.

## Exact private-storage path now available

1. Open Lovable's **drafts panel** and select **Assessment email and private storage staging**. After this turn finishes saving, request **Update draft from main project** (or ask its chat to update). Do not accept the draft into main or publish it.
2. In that draft's chat, request confirmation that its database is still **its own test database**, not the project's live database. Stop if that changes. The copied schema has no live data: synthetic test accounts, roles, sessions and assessments must be established there; do not copy Lee's live records.
3. Ask the draft agent to install **only** `docs/unapplied/private-practice-launch.sql` and `docs/unapplied/reviewer-materials.sql`, each atomically using the supported migration tool. Verify copied base tables/functions/roles first. Do **not** install the obsolete combined `assessment-and-private-practice.sql`: private launch now freezes directly on sessions, not a draft catalog.
4. Inspect **More → Storage** in that draft. Reviewer files reuse the existing **private playbooks bucket**. If missing, ask the agent to create `playbooks` privately using the supported Storage API (not SQL), with at least 4 MB single-file capacity. If present, verify it stays private without changing the main bucket. Custom practice stores its approved scenario snapshot in the database, not raw intake uploads; no new raw-intake bucket is required.
5. Reviewer material paths are `reviewer-supplements/<owner>/<session>/<request>/<hash>` and server-managed. Staged restrictive policies block direct raw access; authenticated downloads recheck owner or currently authorized submitted-session reviewer/admin. No public URLs. Metadata freezes separately from AI scoring at explicit Submit. Material-free submission remains allowed. Install both capabilities last as their files prescribe, regenerate generated types using supported tools.
6. Run synthetic owner/private-practice start → save/reload → normal chapters → persisted nine-score report; test repeat Start, second-owner denial and certification/reviewer exclusion. Run formal reviewer note + synthetic file Submit → reload → authorized reviewer download, second-owner/non-reviewer denial and material-free submission. Verify unchanged historical scores/decisions. Define isolated orphan-upload retention/cleanup before calling reviewer storage deployment-ready; this is still a blocker.
7. For email testing, keep sending disabled. Once sender/infrastructure/scaffold are configured in isolation, apply only `docs/unapplied/assessment-ready-mail.sql` and test mock transport/queue acceptance, suppression/footer and duplicate/crash recovery. No historical backfill, private files or real recipients. Operational mail waking/recovery and actual route response must be proven before enabling the completion adapter.

If isolated draft provisioning stops being available, use **project name → Settings → Remix this project** (or project card ⋯ → Remix) to create a separate staging app. Remix copies structure, not live data. Confirm its separate backend in the new chat before installing anything, confirm any usage/payment prompt yourself, and follow steps 3–7 there. Never infer isolation from a different preview URL alone.

## Verification and limits

Targeted tests execute templates and supported-route adapter against mocked fetch plus staged SQL in disposable local PostgreSQL-compatible databases. They cover no-backfill, confirmed recipient, exclusive lease/CAS, crash recovery, changed-address blocking, human-review status, direct-access denial, private Start and reviewer material policies. These are not hosted bucket/queue tests. All content routes' metadata was inspected; no unrelated coaching changes made.

**Results:** 301 tests passed, 5 opt-in live tests skipped; latest preview build OK. The original targeted seven-file run passed 34 tests before the additional retry/status/crash checks; full regression run includes those added checks. No real-user completion was exercised because sending and shared writes remain forbidden.

No real hosted completion, sender verification, durable queue dispatch, physical storage upload/download or reviewer sign-in in the new draft has been tested yet. Those require switching to that draft and its isolated setup. Main preview and published storage remain unchanged; nothing published.