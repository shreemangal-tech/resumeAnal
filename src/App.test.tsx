import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { excelMarksAndCommentsText } from "./components/ScoreStrip";
import type { AuditResult, ResumeEvidence } from "./domain/types";
import { evaluateResume } from "./evaluation/evaluateResume";
import { extractResume } from "./extraction/extractResume";

vi.mock("./extraction/extractResume", () => ({ extractResume: vi.fn() }));
vi.mock("./evaluation/evaluateResume", () => ({ evaluateResume: vi.fn() }));

const evidence: ResumeEvidence = {
  fileName: "resume.txt",
  fileType: "text/plain",
  text: "Resume content",
  pageCount: null,
  lines: ["Resume content"],
  hyperlinks: [],
  embeddedHyperlinks: [],
  headings: [],
  bullets: [],
  formatting: {
    fontFamilies: null,
    bodyFontSizes: null,
    marginsInches: null,
    hasTables: null,
    hasImages: null,
    hasTextBoxes: null,
    hasColumns: null,
    hasBorders: null,
    hasShading: null,
    usesNonStandardColors: null,
    nameEmphasized: null,
  },
};

const parameterNames = [
  "Visual Appeal",
  "Formatting (ATS)",
  "Organisation of Data",
  "Personal Details",
  "Headings",
  "Career Objective",
  "Education",
  "Extra-Curricular/ Academic Activities",
  "Interpersonal Skills",
  "Interests/Hobbies",
  "Grammatical Accuracy and Punctuation",
  "Trainings and Projects",
];

const result: AuditResult = {
  sourceFileName: "resume.txt",
  awardedTotal: 0,
  maximumTotal: 39,
  isComplete: false,
  parameters: parameterNames.map((parameter, index) => ({
    parameter,
    displayName: `${parameter} (${index === 11 ? 6 : 3})`,
    maxScore: index === 11 ? 6 : 3,
    awardedScore: 0,
    criteria: index === 0 ? [{ criterionText: "Fits exactly one page.", status: "not_followed" as const }] : [],
    feedback: [],
  })),
};

describe("resume audit workflow", () => {
  beforeEach(() => {
    vi.mocked(extractResume).mockReset();
    vi.mocked(evaluateResume).mockReset();
    vi.mocked(extractResume).mockResolvedValue(evidence);
    vi.mocked(evaluateResume).mockReturnValue(result);
  });

  it("selects a file, completes the audit, and resets", async () => {
    const { container } = render(<App />);
    const start = screen.getByRole("button", { name: /Start strict audit/ });
    expect(start).toBeDisabled();

    const file = new File(["resume"], "resume.txt", { type: "text/plain" });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(start).toBeEnabled();
    expect(screen.getByText("resume.txt")).toBeInTheDocument();

    fireEvent.click(start);
    expect(await screen.findByRole("heading", { name: "resume.txt" })).toBeInTheDocument();
    expect(extractResume).toHaveBeenCalledWith(file, expect.any(Function));
    expect(evaluateResume).toHaveBeenCalledWith(evidence);
    expect(screen.getAllByRole("article")).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Copy marks + comments for Excel" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Copy .* mark 0/ })).toHaveLength(24);
    expect(screen.getAllByText("Fits exactly one page.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Source checks/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Audit another resume" }));
    expect(screen.getByRole("heading", { name: "Upload your resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start strict audit/ })).toBeDisabled();
  });

  it("copies marks and exact failed rubric comments in Excel-aligned rows", () => {
    const text = excelMarksAndCommentsText(result.parameters);
    const [marksRow, commentsRow] = text.split("\n");
    expect(marksRow.split("\t")).toHaveLength(12);
    expect(commentsRow.split("\t")).toHaveLength(12);
    expect(commentsRow.split("\t")[0]).toBe("Fits exactly one page.");
    expect(commentsRow.split("\t")[1]).toBe("");
  });

  it("rejects unsupported drops and recovers visibly from extraction errors", async () => {
    vi.mocked(extractResume).mockRejectedValueOnce(new Error("Unsupported or unreadable resume file."));
    const { container } = render(<App />);
    const unsupported = new File(["bad"], "resume.rtf", { type: "application/rtf" });

    fireEvent.drop(container.querySelector(".drop-zone")!, { dataTransfer: { files: [unsupported] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a PDF, DOCX, or TXT resume.");
    expect(screen.getByRole("button", { name: /Start strict audit/ })).toBeDisabled();

    const supported = new File(["bad"], "resume.txt", { type: "text/plain" });
    fireEvent.drop(container.querySelector(".drop-zone")!, { dataTransfer: { files: [supported] } });
    fireEvent.click(screen.getByRole("button", { name: /Start strict audit/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unsupported or unreadable resume file.");
    await waitFor(() => expect(screen.getByRole("button", { name: /Start strict audit/ })).toBeEnabled());
  });
});
