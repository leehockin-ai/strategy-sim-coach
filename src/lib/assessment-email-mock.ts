import React from "react";
import { TEMPLATES } from "./email-templates/registry";

/** Fixed fictional data only; deliberately accepts no session or recipient input. */
export const ASSESSMENT_EMAIL_MOCK = Object.freeze({
  from: "Coach Compass <assessments@example.test>",
  to: "coach@example.test",
  templateData: Object.freeze({
    reportUrl: "#mock-report",
    status: "Your AI assessment is ready. Human review is pending; this is not a certification decision.",
  }),
});

export async function renderAssessmentEmailMock() {
  const entry = TEMPLATES["assessment-ready"];
  if (!entry) throw new Error("Assessment email template is unavailable.");
  // Loaded only on demand. Neither the registry nor renderer imports the sender.
  const { render } = await import("@react-email/render");
  return {
    ...ASSESSMENT_EMAIL_MOCK,
    subject: typeof entry.subject === "function" ? entry.subject(ASSESSMENT_EMAIL_MOCK.templateData) : entry.subject,
    html: await render(React.createElement(entry.component, ASSESSMENT_EMAIL_MOCK.templateData)),
  };
}