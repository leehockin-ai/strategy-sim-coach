// Minimal notifications helper. Build 1's full notification bell hasn't landed
// yet in this project; this stub keeps the call sites stable so the
// notification kind and shape are correct when the full system arrives.
//
// For now, notify() just logs server-side. When the notifications table /
// realtime bell is added, replace the body of notify() with an insert into
// public.notifications — call sites won't have to change.

export type NotificationKind =
  | "evaluation_ready"
  | "reviewer_decided"
  | "submission_received"
  | "assignment_received"
  | "system";

export type NotifyInput = {
  recipientId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  deepLink?: string;
  metadata?: Record<string, unknown>;
};

export async function notify(input: NotifyInput): Promise<void> {
  // TODO(notifications-bell): persist to public.notifications and emit realtime.
  console.log("[notify]", {
    recipientId: input.recipientId,
    kind: input.kind,
    title: input.title,
    deepLink: input.deepLink,
  });
}
