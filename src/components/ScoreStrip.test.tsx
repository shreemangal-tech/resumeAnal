import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ParameterResult } from "../domain/types";
import { excelMarksText, ScoreStrip } from "./ScoreStrip";

const parameters = [2, 1, 3].map((awardedScore, index): ParameterResult => ({
  parameter: `Parameter ${index + 1}`,
  displayName: `Parameter ${index + 1} (3)`,
  maxScore: 3,
  awardedScore,
  criteria: [],
  feedback: [],
}));

describe("Excel-ready score copying", () => {
  it("creates one tab-separated row of numeric marks", () => {
    expect(excelMarksText(parameters)).toBe("2\t1\t3");
  });

  it("copies the horizontal values without labels or extra text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ScoreStrip parameters={parameters} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy values for Excel" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("2\t1\t3"));
    expect(screen.getByRole("button", { name: "Excel values copied" })).toBeInTheDocument();
  });
});
