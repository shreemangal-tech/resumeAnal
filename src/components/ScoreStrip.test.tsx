import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ParameterResult } from "../domain/types";
import { excelMarksText, ScoreStrip } from "./ScoreStrip";

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
  it("creates one tab-separated row of numeric marks only", () => {
    expect(excelMarksText(parameters)).toBe("2\t1\t3");
    expect(excelMarksText(parameters)).not.toContain("Exact source-sheet deduction point.");
    expect(excelMarksText(parameters)).not.toContain("\n");
  });

  it("copies only the horizontal numeric marks", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<ScoreStrip parameters={parameters} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy marks for Excel" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("2\t1\t3"));
    expect(screen.getByRole("button", { name: "Excel marks copied" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download Excel with hover comments" })).toBeInTheDocument();
  });
});
