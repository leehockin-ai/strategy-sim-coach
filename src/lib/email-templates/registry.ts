import type { ComponentType } from "react";
import { template as assessmentReady } from "./assessment-ready";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  to?: string;
  displayName?: string;
  previewData?: Record<string, unknown>;
}
export const TEMPLATES: Record<string, TemplateEntry> = { "assessment-ready": assessmentReady };