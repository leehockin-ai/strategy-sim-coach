import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "./email-templates/registry";
import { ASSESSMENT_EMAIL_MOCK, renderAssessmentEmailMock } from "./assessment-email-mock";

describe("local assessment email mock", () => {
  it("uses only the specified fictional sender and recipient", async () => {
    const result = await renderAssessmentEmailMock();
    expect(result.from).toBe("Coach Compass <assessments@example.test>");
    expect(result.to).toBe("coach@example.test");
    expect(Object.keys(result.templateData).sort()).toEqual(["reportUrl", "status"]);
  });

  it("renders the actual registered template, not a duplicate email", async () => {
    const entry = TEMPLATES["assessment-ready"];
    const expected = await render(React.createElement(entry.component, ASSESSMENT_EMAIL_MOCK.templateData));
    const result = await renderAssessmentEmailMock();
    expect(result.html).toBe(expected);
    expect(result.subject).toBe(entry.subject);
  });

  it("uses an inert fragment and cannot make transport or persistence requests", async () => {
    const fetch = vi.fn(() => { throw new Error("No network allowed"); });
    vi.stubGlobal("fetch", fetch);
    try {
      const result = await renderAssessmentEmailMock();
      expect(result.templateData.reportUrl).toBe("#mock-report");
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});