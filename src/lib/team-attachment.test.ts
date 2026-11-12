import { describe, it, expect } from "vitest";
import { MAX_SCREENSHOT_BYTES, screenshotSchema, validateScreenshot, screenshotContent, readImageReply } from "./team-attachment";
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOaYAAAAASUVORK5CYII=";
describe("in-memory screenshots", () => {
  it("accepts actual PNG bytes without adding persisted metadata", () => { expect(screenshotSchema.parse({ dataUrl: png })).toEqual({ dataUrl: png }); });
  it("rejects SVG, remote URLs and MIME spoofing", () => { for (const v of ["https://example.com/a.png", "data:image/svg+xml;base64,PHN2Zz4=", png.replace("image/png", "image/jpeg")]) expect(() => validateScreenshot(v)).toThrow(); });
  it("enforces the 4 MB bound", () => { expect(() => validateScreenshot("data:image/png;base64," + "A".repeat(Math.ceil((MAX_SCREENSHOT_BYTES + 3) / 3) * 4))).toThrow(); });
  it("rejects zero and oversized PNG dimensions", () => { const b = Uint8Array.from(atob(png.split(",")[1]), c => c.charCodeAt(0)); const d = new DataView(b.buffer); d.setUint32(16, 0); expect(() => validateScreenshot("data:image/png;base64," + btoa(String.fromCharCode(...b)))).toThrow(); d.setUint32(16, 10000); d.setUint32(20, 10000); expect(() => validateScreenshot("data:image/png;base64," + btoa(String.fromCharCode(...b)))).toThrow(); });
  it("builds nested Chat Completions image parts", () => { expect(screenshotContent("question", png)[1]).toEqual({ type: "image_url", image_url: { url: png } }); });
  it("reads streamed replies and rejects incomplete streams", async () => { const response = new Response('data: {"choices":[{"delta":{"content":"[Maya Chen] Draft"}}]}\n\ndata: [DONE]\n\n'); expect(await readImageReply(response)).toBe("[Maya Chen] Draft"); await expect(readImageReply(new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'))).rejects.toThrow("did not finish"); });
  it("surfaces terminal stream errors without an answer", async () => { await expect(readImageReply(new Response('data: {"error":{"message":"Access denied"}}\n\n'))).rejects.toThrow("Access denied"); });
});