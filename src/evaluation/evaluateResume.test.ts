import { describe, expect, it } from "vitest";
import { evaluateResume } from "./evaluateResume";
import type { ResumeEvidence } from "../domain/types";

const evidence: ResumeEvidence = {
  fileName: "student.txt",
  fileType: "txt",
  pageCount: null,
  lines: ["Aarav Sharma", "+91 9876543210", "aarav.sharma@example.com", "https://linkedin.com/in/aarav", "EDUCATION", "Bachelor of Technology, Example University, 2026, CGPA 8.5"],
  text: "Aarav Sharma\n+91 9876543210\naarav.sharma@example.com\nhttps://linkedin.com/in/aarav\nEDUCATION\nBachelor of Technology, Example University, 2026, CGPA 8.5",
  hyperlinks: ["https://linkedin.com/in/aarav"],
  embeddedHyperlinks: ["https://linkedin.com/in/aarav"],
  headings: ["EDUCATION"],
  bullets: [],
  formatting: {
    fontFamilies: null, bodyFontSizes: null, marginsInches: null, hasTables: null, hasImages: null,
    hasTextBoxes: null, hasColumns: null, hasBorders: null, hasShading: null,
    usesNonStandardColors: null, nameEmphasized: null,
  },
};

describe("resume evaluation", () => {
  it("returns 12 traceable parameter results and a /39 maximum", () => {
    const audit = evaluateResume(evidence);
    expect(audit.parameters).toHaveLength(12);
    expect(audit.maximumTotal).toBe(39);
    expect(audit.parameters.every((parameter) => parameter.criteria.length > 0)).toBe(true);
  });

  it("records evidence for every actual deduction", () => {
    const audit = evaluateResume(evidence);
    const deductions = audit.parameters.flatMap((parameter) => parameter.criteria.filter((criterion) => criterion.status === "not_followed"));
    expect(deductions.length).toBeGreaterThan(0);
    expect(deductions.every((criterion) => Boolean(criterion.evidence))).toBe(true);
  });

  it("returns every exact source criterion from each independent evaluator", () => {
    const audit = evaluateResume(evidence);
    expect(audit.parameters.map((parameter) => parameter.criteria.length)).toEqual([6, 7, 3, 3, 3, 4, 3, 4, 6, 5, 5, 4]);
  });

  it("keeps every displayed mark and the /39 total reconciled to its source checks", () => {
    const audit = evaluateResume(evidence);
    expect(audit.awardedTotal).toBe(audit.parameters.reduce((total, parameter) => total + parameter.awardedScore, 0));
    expect(audit.parameters.every((parameter) => parameter.scoringNote?.startsWith("Workbook band rule:"))).toBe(true);
    expect(audit.parameters.every((parameter) => parameter.criteria.every((criterion) => criterion.status === "followed" || criterion.status === "not_followed"))).toBe(true);
  });

  it("uses only the workbook's followed/not-followed decisions", () => {
    const audit = evaluateResume(evidence);
    expect(audit.parameters.flatMap((parameter) => parameter.criteria).every((criterion) => ["followed", "not_followed"].includes(criterion.status))).toBe(true);
    expect(audit.parameters[3].criteria[0].status).toBe("not_followed");
    expect(audit.parameters[5].criteria[3].status).toBe("not_followed");
    expect(audit.parameters[10].criteria[3].status).toBe("not_followed");
  });

  it("writes criterion-specific reviewer feedback without generic filler", () => {
    const audit = evaluateResume(evidence);
    const feedback = audit.parameters.flatMap((parameter) => parameter.feedback);
    expect(feedback.length).toBeGreaterThan(0);
    expect(feedback.every((item) => item.includes("—"))).toBe(true);
    expect(feedback.join(" ")).not.toMatch(/could be improved|make it more professional|great job|keep it up/i);
  });

  it("counts industry keywords and valid present/past action verbs", () => {
    const lines = [
      "Aarav Sharma",
      "TECHNICAL SKILLS",
      "React, React Native, TypeScript, Redux, JavaScript",
      "PROFESSIONAL EXPERIENCE",
      "• Worked with designers and backend teams to deliver a stable application.",
      "• Used React Native and TypeScript to build reliable mobile workflows.",
      "• Added Redux state handling to improve performance for users.",
      "• Focused testing efforts on reducing production defects.",
    ];
    const audit = evaluateResume({
      ...evidence,
      text: lines.join("\n"),
      lines,
      headings: ["TECHNICAL SKILLS", "PROFESSIONAL EXPERIENCE"],
      bullets: lines.filter((line) => line.startsWith("•")),
    });
    expect(audit.parameters[10].criteria.map((criterion) => criterion.status)).toEqual([
      "followed", "followed", "followed", "followed", "followed",
    ]);
    expect(audit.parameters[10].awardedScore).toBe(3);
  });
});
