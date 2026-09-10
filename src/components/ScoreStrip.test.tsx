import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ParameterResult } from "../domain/types";
import { excelMarksAndCommentsText, excelMarksText, ScoreStrip } from "./ScoreStrip";

const parameters = [2, 1, 3].map((awardedScore, index): ParameterResult => ({
  parameter: `Parameter ${index + 1}`,
  displayName: `Parameter ${index + 1} (3)`,
  maxScore: 3,
  awardedScore,
  criteria: index === 0
    ? [{ criterionText: "Exact source-sheet deduction point.", status: "not_followed" }]
    : [],
  feedback: [],
}));

describe("Excel-ready score copying", () => {
  it("creates one tab-separated row of numeric marks", () => {
    expect(excelMarksText(parameters)).toBe("2\t1\t3");
  });

  it("creates aligned mark and exact source-comment rows", () => {
    expect(excelMarksAndCommentsText(parameters)).toBe(
      "2\t1\t3\nExact source-sheet deduction point.\t\t",
    );
  });

  it("copies marks and comments for Excel", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<ScoreStrip parameters={parameters} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy marks + comments for Excel" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(excelMarksAndCommentsText(parameters)));
    expect(screen.getByRole("button", { name: "Excel rows copied" })).toBeInTheDocument();
  });
});
