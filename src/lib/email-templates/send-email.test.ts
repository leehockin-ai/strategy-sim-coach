import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailAPIError, sendLovableEmail } from "@lovable.dev/email-js";
import { sendTemplateEmail } from "./send-email";

vi.mock("@lovable.dev/email-js", async (original) => {
  const actual = await original<typeof import("@lovable.dev/email-js")>();
  return { ...actual, sendLovableEmail: vi.fn() };
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("managed sender setup without real sends", () => {
  it("uses notify.strategyzer.com and stable assessment identity", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "synthetic-test-only");
    vi.mocked(sendLovableEmail).mockResolvedValue({} as Awaited<ReturnType<typeof sendLovableEmail>>);
    await expect(sendTemplateEmail("assessment-ready", "synthetic@example.invalid", {
      idempotencyKey: "assessment-ready:synthetic-event",
      templateData: { status: "Pending human review." },
    })).resolves.toEqual({ sent: true });
    expect(sendLovableEmail).toHaveBeenCalledWith(expect.objectContaining({
      sender_domain: "notify.strategyzer.com",
      from: { name: "Coach Compass", address: "noreply@strategyzer.com" },
      to: "synthetic@example.invalid",
      idempotency_key: "assessment-ready:synthetic-event",
      purpose: "transactional",
    }), expect.any(Object));
  });
  it("fails closed without configured credentials", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "");
    await expect(sendTemplateEmail("assessment-ready", "synthetic@example.invalid")).rejects.toThrow("not configured");
    expect(sendLovableEmail).not.toHaveBeenCalled();
  });
  it("does not bypass recipient suppression", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "synthetic-test-only");
    const error = Object.assign(Object.create(EmailAPIError.prototype), { code: "recipient_suppressed" });
    vi.mocked(sendLovableEmail).mockRejectedValue(error);
    await expect(sendTemplateEmail("assessment-ready", "synthetic@example.invalid")).resolves.toEqual({ sent: false, reason: "recipient_suppressed" });
    expect(sendLovableEmail).toHaveBeenCalledTimes(1);
  });
});