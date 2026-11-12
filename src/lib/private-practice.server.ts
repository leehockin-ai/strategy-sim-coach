import { PRACTICE_START_BLOCKER } from "./custom-scenario";
import { hydratePracticeSession, practiceStartSchema, PRIVATE_PRACTICE_VERSION } from "./practice-access";
import { assertEntitlement } from "./entitlements.server";

export async function privatePracticeAvailable(client: any) {
  const result = await client.rpc("private_practice_capability");
  return !result.error && result.data === PRIVATE_PRACTICE_VERSION;
}

export async function launchPrivatePractice(client: any, userId: string, input: unknown) {
  await assertEntitlement(userId, "custom_practice_launch");
  const data = practiceStartSchema.parse(input);
  if (!(await privatePracticeAvailable(client))) throw new Error(PRACTICE_START_BLOCKER);
  const result = await client.rpc("start_private_practice", { _request: data.requestId, _draft: data.draft });
  if (result.error || !result.data) throw new Error("Private practice could not start. Your reviewed draft is retained; retry explicitly.");
  const session = hydratePracticeSession(result.data);
  if (session.owner_id !== userId || !session.custom_practice_snapshot) throw new Error("Private practice not found");
  return { session };
}