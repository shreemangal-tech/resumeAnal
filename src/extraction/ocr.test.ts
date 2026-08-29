import { describe, expect, it } from "vitest";
import { textFromOcrBlocks } from "./ocr";

describe("OCR reading order", () => {
  it("keeps two-column blocks together instead of merging same-row headings", () => {
    const text = textFromOcrBlocks([
      { text: "Mahesh", bbox: { x0: 400, y0: 40, x1: 650, y1: 90 } },
      { text: "CONTACT\n555-0100", bbox: { x0: 30, y0: 250, x1: 300, y1: 400 } },
      { text: "SOFT SKILLS\nTeamwork", bbox: { x0: 30, y0: 450, x1: 300, y1: 600 } },
      { text: "PROFILE\nFrontend student", bbox: { x0: 420, y0: 200, x1: 950, y1: 380 } },
      { text: "EDUCATION\nBachelor of Engineering", bbox: { x0: 420, y0: 430, x1: 950, y1: 680 } },
    ], 1000, 1000, "fallback");

    expect(text.indexOf("CONTACT")).toBeLessThan(text.indexOf("SOFT SKILLS"));
    expect(text.indexOf("SOFT SKILLS")).toBeLessThan(text.indexOf("PROFILE"));
    expect(text).toContain("EDUCATION\nBachelor of Engineering");
  });

  it("uses plain OCR text if blocks are unavailable", () => {
    expect(textFromOcrBlocks(null, 1000, 1000, "  PROFILE  \n  Resume text ")).toBe("PROFILE\nResume text");
  });
});
