import { describe, expect, it } from "vitest";

import { extractPdfText, hasPdfSignature } from "@/server/pdf";

import { makePdf } from "../support/pdf";

describe("PDF helpers", () => {
  it("recognises the PDF signature", () => {
    expect(hasPdfSignature(makePdf(["hi"]))).toBe(true);
    expect(hasPdfSignature(new TextEncoder().encode("MZ fake exe"))).toBe(false);
    expect(hasPdfSignature(new Uint8Array())).toBe(false);
  });

  it("extracts text from a PDF", async () => {
    const result = await extractPdfText(
      makePdf(["Jane Developer", "Skills: React, TypeScript (5 years)"]),
    );
    expect(result.pages).toBe(1);
    expect(result.text).toContain("Jane Developer");
    expect(result.text).toContain("React, TypeScript (5 years)");
  });

  it("rejects bytes that only look like a PDF", async () => {
    await expect(extractPdfText(new TextEncoder().encode("%PDF-1.4 garbage"))).rejects.toThrow();
  });
});
