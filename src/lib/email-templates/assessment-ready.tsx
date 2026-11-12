import React from "react";
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props { reportUrl?: string; status?: string }
const AssessmentReady = ({ reportUrl, status }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Coach Compass assessment is available in your signed-in report.</Preview>
    <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", color: "#242424" }}>
      <Container style={{ padding: "32px 24px", maxWidth: "560px" }}>
        <Text>Coach Compass</Text>
        <Heading>Your assessment is ready</Heading>
        <Text>{status || "See your signed-in report for its current review status."}</Text>
        <Text>Sign in with the account that owns this assessment to open the report.</Text>
        {reportUrl && <Button href={reportUrl} style={{ backgroundColor: "#242424", color: "#ffffff", padding: "12px 18px", borderRadius: "4px" }}>Open my report</Button>}
      </Container>
    </Body>
  </Html>
);
export const template = {
  component: AssessmentReady,
  subject: "Your Coach Compass assessment is ready",
  displayName: "Assessment ready",
  previewData: { status: "Your assessment is ready. See the signed-in report for its review status." },
} satisfies TemplateEntry;