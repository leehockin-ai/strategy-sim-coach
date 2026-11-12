# notify.strategyzer.com email setup

The supported setup tools identify this project as managed email delivery, not the older queue-based service. The configured domain is verifying DNS; monitor More → Emails. No domain polling or real sends performed.

## Configured in preview
- Server-only managed sender helper: Coach Compass sender name, notify.strategyzer.com sender identity, platform-selected strategyzer.com display domain. Scaffolded sender constants retained unchanged.
- Existing assessment-ready template preserved and registered. Minimal signed-in report link/status, no scores or private assessment payload.
- API-key-protected dashboard template preview, dependency installation, entities resolution pin, server-only environment loading and middleware pass-through.
- Assessment adapter now calls the managed helper with stable assessment idempotency instead of a nonexistent queue endpoint; suppression remains terminal.

## Not activated
- DNS verification pending. Domain setup can take up to 72 hours.
- Automatic assessment completion stays explicitly disabled. No emails, backfill, shared schema/data changes, private storage installation or publishing.
- The older staged feature-outbox schema is not platform email infrastructure and remains unapplied. Before automatic completion activation, verify durable event identity/owner checks in the isolated staging draft and replace queue-era acceptance wording with truthful managed-send status.
- Prior setup documents describing platform queue/scaffold prerequisites are superseded by the managed delivery result for this project.

For a new sender domain, start with low volumes; deliverability generally improves over the first 2–4 weeks.