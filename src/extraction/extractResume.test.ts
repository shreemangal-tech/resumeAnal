import { describe, expect, it } from "vitest";
import { extractResume } from "./extractResume";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { evaluateResume } from "../evaluation/evaluateResume";

describe("resume extraction", () => {
  it("extracts text lines, headings, bullets, and links from TXT", async () => {
    const file = new File([
      "Aarav Sharma\nhttps://example.com\nEDUCATION\n• Bachelor of Technology, Example University, 2026, CGPA 8.5",
    ], "student.TXT", { type: "text/plain" });
    const evidence = await extractResume(file);
    expect(evidence.fileType).toBe("txt");
    expect(evidence.lines[0]).toBe("Aarav Sharma");
    expect(evidence.headings).toEqual(["EDUCATION"]);
    expect(evidence.headingCandidates).toEqual(["EDUCATION"]);
    expect(evidence.bullets).toHaveLength(1);
    expect(evidence.hyperlinks).toContain("https://example.com");
    expect(evidence.embeddedHyperlinks).toEqual([]);
  });

  it("rejects unsupported and empty files with specific messages", async () => {
    await expect(extractResume(new File(["resume"], "student.rtf"))).rejects.toThrow(/PDF, DOCX, or TXT/);
    await expect(extractResume(new File(["  \n"], "student.txt"))).rejects.toThrow(/No readable resume text/);
  });

  it("preserves DOCX structure, links, and only fonts used by the document", async () => {
    const bytes = await readFile(path.join(process.cwd(), "src", "test", "fixtures", "sample-resume.docx"));
    const file = new File([bytes], "sample-resume.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const evidence = await extractResume(file);
    expect(evidence.headings).toContain("EDUCATION");
    expect(evidence.headings).toContain("INTERPERSONAL SKILLS");
    expect(evidence.bullets.length).toBeGreaterThanOrEqual(5);
    expect(evidence.embeddedHyperlinks).toEqual(expect.arrayContaining(["https://linkedin.com/in/aarav-sharma", "https://aarav.dev"]));
    expect(evidence.formatting.fontFamilies).toEqual(["Calibri"]);
    expect(evidence.formatting.hasTables).toBe(false);
    expect(evidence.formatting.hasColumns).toBe(false);
    const audit = evaluateResume(evidence);
    expect(audit.parameters[6].criteria[1].status, JSON.stringify(evidence.lines)).toBe("followed");
    expect(audit.parameters[10].criteria[4].status, JSON.stringify(evidence.bullets)).toBe("followed");
  });

  it("recognizes professional, company-project, and open-source section aliases", async () => {
    const file = new File([[
      "Aarav Sharma",
      "PROFESSIONAL SUMMARY",
      "Frontend Engineer. Builds React applications. Mentors engineers through code reviews.",
      "TECHNICAL SKILLS",
      "Frontend: React, TypeScript",
      "PROFESSIONAL EXPERIENCE",
      "• Collaborated with product and QA teams to deliver a stable application.",
      "SELECTED COMPANY PROJECTS",
      "Inventory Platform | Example Company",
      "• Built reliable inventory workflows for enterprise users.",
      "Tech: React, TypeScript, REST APIs.",
      "PERSONAL OPEN-SOURCE ENGINEERING",
      "SignalForge",
      "• Designed and published a React state-management library.",
      "Tech: React, TypeScript.",
      "EDUCATION",
      "Bachelor of Technology, Example University, 2020, CGPA 8.5",
    ].join("\n")], "aliases.txt", { type: "text/plain" });

    const extracted = await extractResume(file);
    expect(extracted.headings).toEqual(expect.arrayContaining([
      "PROFESSIONAL EXPERIENCE",
      "SELECTED COMPANY PROJECTS",
      "PERSONAL OPEN-SOURCE ENGINEERING",
    ]));
    const audit = evaluateResume(extracted);
    expect(audit.parameters.every((parameter) => parameter.awardedScore !== null)).toBe(true);
    expect(audit.parameters[8].awardedScore).toBeGreaterThan(0);
    expect(audit.parameters[10].criteria[4].evidence).not.toMatch(/No auditable work bullets/i);
    expect(audit.parameters[11].criteria.some((criterion) => criterion.status === "followed")).toBe(true);
  });

  it("retains non-standard uppercase section headings for rubric review", async () => {
    const file = new File(["Aarav Sharma\nEDUCATION\nBachelor of Technology\nMY JOURNEY\nBuilt several applications."], "headings.txt", { type: "text/plain" });
    const extracted = await extractResume(file);
    expect(extracted.headings).toEqual(["EDUCATION"]);
    expect(extracted.headingCandidates).toEqual(["EDUCATION", "MY JOURNEY"]);
    const audit = evaluateResume(extracted);
    expect(audit.parameters[4].criteria[0]).toMatchObject({ status: "not_followed" });
    expect(audit.parameters[4].criteria[0].evidence).toMatch(/MY JOURNEY/);
  });
});
