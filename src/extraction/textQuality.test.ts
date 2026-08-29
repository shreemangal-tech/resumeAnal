import { describe, expect, it } from "vitest";
import { cleanOcrText, hasUsableResumeText, separateEmbeddedOcrHeadings } from "./textQuality";

describe("PDF text quality", () => {
  it("rejects empty and stray PDF text fragments", () => {
    expect(hasUsableResumeText(" ")).toBe(false);
    expect(hasUsableResumeText("Scanned by mobile app")).toBe(false);
  });

  it("accepts resume-sized readable text", () => {
    expect(hasUsableResumeText("Mahesh Kumar Profile Frontend developer with experience building reliable web and mobile applications Education Bachelor degree Technical Skills React TypeScript Projects Inventory Platform")).toBe(true);
  });

  it("cleans spacing without correcting source spelling", () => {
    expect(cleanOcrText("  INTERESTS  \r\n\r\n\r\n Danceing   and music ")).toBe("INTERESTS\n\nDanceing and music");
  });

  it("separates rubric headings merged across scanned resume columns", () => {
    expect(separateEmbeddedOcrHeadings("LANGUAGES TECHNICAL SKILLS\nfor Innovation (=) ACADEMIC PROJECTS"))
      .toBe("LANGUAGES\nTECHNICAL SKILLS\nfor Innovation (=)\nACADEMIC PROJECTS");
  });

  it("extracts an embedded heading without changing surrounding OCR text", () => {
    expect(separateEmbeddedOcrHeadings("S krishna colony malgodam EDUCATION"))
      .toBe("S krishna colony malgodam\nEDUCATION");
  });
});
