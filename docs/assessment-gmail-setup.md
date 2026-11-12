# Gmail assessment-ready sender — prepared, not enabled

Dedicated sender: **Coach Compass <coachcompass.notifications@gmail.com>**.
No custom domain/DNS or ChatGPT/Lovable Gmail connector is involved. This is a
single app-owned mailbox, not per-candidate Gmail access. No credentials have
been requested, stored or read; no actual email has been sent.

## One-time Google setup (Lee / mailbox owner)

1. Sign in as this mailbox at [Google Cloud Console](https://console.cloud.google.com/).
   Create/select a dedicated project. Under **APIs & Services → Library**, enable
   **Gmail API**. No billing commitment is introduced by this code; Google account
   policies and Gmail sending limits still apply.
2. Open **Google Auth Platform → Branding**. Set app name **Coach Compass**,
   user support email and developer contact to the mailbox (or your approved
   contact). Complete required consent information. Under **Audience**, choose
   **External**, keep **Testing**, and add only this mailbox as a test user.
3. Under **Data Access**, add only
   `https://www.googleapis.com/auth/gmail.send`. Do not request inbox read,
   modify, full mail access, or end-user access. `gmail.send` is a sensitive
   scope: public production consent may require Google verification; do not
   bypass it. Testing refresh tokens for Gmail access typically expire after
   seven days. Move to **In production** only after the applicable Google
   requirements are understood/completed; production tokens can still be
   revoked or expire through inactivity/account policy.
4. Under **Clients → Create client**, choose **Web application**, name it
   **Coach Compass assessment sender setup**, and add the exact authorized
   redirect URI `https://developers.google.com/oauthplayground`. No app callback
   or publish is needed for this one-time owner setup.
5. Open [Google OAuth Playground](https://developers.google.com/oauthplayground/)
   on your own computer. Gear/settings: **Use your own OAuth credentials**, enter
   the client ID/secret from step 4, choose **Offline** access and consent prompt
   when offered. In step 1 enter the exact `gmail.send` scope above and authorize
   **coachcompass.notifications@gmail.com** (check the account carefully).
   Step 2: **Exchange authorization code for tokens**. Keep the refresh token
   private. If none is issued, repeat with consent/offline after reviewing the
   existing grant; never paste any token/client secret into chat. Avoid shared
   devices, screenshots, logs or saved playground URLs containing credentials.
   Using your own OAuth client is essential; do not use Playground's default
   client, whose refresh tokens are unsuitable for this app.
6. In the **isolated staging app**, open **Project Settings → Secrets** and enter:

   | Name | Value |
   | --- | --- |
   | `ASSESSMENT_GMAIL_CLIENT_ID` | Your Google OAuth web client ID |
   | `ASSESSMENT_GMAIL_CLIENT_SECRET` | That client's secret |
   | `ASSESSMENT_GMAIL_REFRESH_TOKEN` | The mailbox's offline refresh token |
   | `ASSESSMENT_GMAIL_ENABLED` | Keep `false` until separate live-send approval |

   No `VITE_` prefix, committed `.env`, private keys in code, or credentials in
   chat. Only the server reads these values. The access token is refreshed for
   each attempt and stays in memory. Revoke the grant in the Google account and
   update Secrets if compromised. No token is shown by the app.

## Existing boundaries and staged enablement

- `ASSESSMENT_MAIL_ENABLED` remains **false** regardless of secret settings.
  Report reads never trigger a backfill. Completion is the existing central
  post-persisted assessment hook, without scenario filtering (including custom).
- Gmail is explicit `MailConfig.transport = "gmail"`; no automatic fallback
  between Gmail and managed delivery. Managed domain code stays intact.
- The server claims the existing new-assessment-only outbox, revalidating the
  confirmed owner address and current review status. No arbitrary recipient,
  client-supplied From/body or public send endpoint exists. Only the registered
  assessment-ready template renders HTML/plain text. No scores/names/private
  materials enter the email. Report URL stays on the deployment-controlled
  HTTPS allowlist and requires the owning signed-in account.
- Install **only in an approved isolated backend**, in order:
  `docs/unapplied/assessment-ready-mail.sql`, then
  `docs/unapplied/assessment-gmail-outcomes.sql`. Both remain unapplied here.
  Never install the obsolete combined assessment/private-practice design.
  The Gmail overlay replaces neither historical evidence nor capture behavior.
- Activation still requires an approved server dispatcher/wakeup/recovery path
  and runtime configuration wired to the existing completion boundary. There
  is no new scheduler, public endpoint or background delivery claim in this
  work. A code-level activation plus secrets alone is not an installed service.
- Before activation: isolated owner/privacy/concurrency tests, an explicitly
  approved synthetic new assessment and first controlled email, correct mailbox
  OAuth grant, persisted accepted/ambiguous status, and failure/restart tests.
  Do not send existing historical reports. Live sending and publishing require
  separate approval, not implied by this preparation.

## Delivery integrity (important Gmail limitation)

One outbox identity per assessment is **not exactly-once Gmail delivery**.
Gmail `messages.send` has no idempotency parameter. Stable RFC Message-ID is
correlation only; duplicate calls may send duplicate emails. Gmail API receipt
means **accepted**, not delivered, read, or human-reviewed.

After token refresh/rendering, `begin_assessment_gmail_send` atomically reserves
the attempt **before** POST. Only the current unexpired lease can reserve it.
`sending`, `accepted`, and `ambiguous` cannot be automatically reclaimed, even
after lease expiry or process crash. A crash before POST may therefore omit a
notice; that is deliberately safer than silently sending duplicates.

| Failure | Durable result / action |
| --- | --- |
| Refresh timeout/429/5xx, before POST | Retry permitted; no message was submitted |
| OAuth invalid/revoked grant or missing scope | Blocked; fix owner authorization, no automatic send retry |
| Send 400/401/403/404 | Explicit rejection; blocked |
| Send 429 | Explicit rejection; retry permitted after staged outbox delay (at least 60 seconds) |
| Send timeout/network loss/5xx/other uncertain HTTP | Ambiguous; no blind retry |
| Successful HTTP with missing/malformed receipt | Ambiguous; no blind retry |
| Gmail receipt, but outbox settlement fails | Sending hold/ambiguous return; no blind retry |

Manually inspect the dedicated mailbox's **Sent** view using assessment
Message-ID and recipient/time when a result is unknown; no inbox-read scope is
added to automate this. Absence from Sent is not proof it cannot later appear.
Any resend decision requires explicit operator approval acknowledging duplicate
risk. No automatic reset/reconciliation, delivery/read claim or invented status.
Errors expose bounded category and HTTP status, not token/provider body contents.

## Verification in this change

All HTTP calls in tests are injected mocks, using fictional tokens and
`coach@example.test`. Disposable in-memory PostgreSQL tests exercise both
staged SQL files, identity/lease/CAS, post-reservation crash holds, accepted and
ambiguous terminal states, no historical capture and role denial. Existing
managed template/completion regressions remain covered. No shared database
changes, real OAuth request, actual email, new secrets or publish occurred.
No temporary mock content route was found; the existing requested mock dialog
and protected managed template preview were left unchanged.

Verification result: **332 tests passed, 5 opt-in live tests skipped**; the latest
preview build reports **build OK**. Gmail-specific HTTP mocks cover 24 cases;
the additional isolated SQL test executes both staged migrations without
touching any hosted database. Live OAuth/mailbox delivery remains unverified
and disabled, pending the setup and approvals above.