import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copyAuditText, ParameterCard } from "./ParameterCard";
import type { ParameterResult } from "../domain/types";

describe("per-parameter copy output", () => {
  it("copies only the selected parameter with its mark and evidence", () => {
    const parameter: ParameterResult = {
      parameter: "Education",
      displayName: "Education (3)",
      maxScore: 3,
      awardedScore: 2,
      feedback: ["A year is missing."],
      criteria: [{ criterionText: "Year present for every entry.", status: "not_followed", evidence: "One entry has no year." }],
    };
    expect(copyAuditText(parameter)).toBe("Education (3)\nMark: 2 / 3\nBand: Satisfactory\nSource checks (not marks): 0 of 1 followed; 1 not followed\n- not followed: Year present for every entry.\n  Evidence: One entry has no year.");
  });

  it("copies the selected parameter from its card", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const parameter: ParameterResult = {
      parameter: "Education",
      displayName: "Education (3)",
      maxScore: 3,
      awardedScore: 3,
      feedback: [],
      criteria: [{ criterionText: "Year present for every entry.", status: "followed", evidence: "2025" }],
    };

    render(<ParameterCard parameter={parameter} index={6} />);
    expect(screen.getByText("Highly Satisfactory")).toBeInTheDocument();
    expect(screen.getByText("Source checks (not marks): 1/1 followed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy audit" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(copyAuditText(parameter)));
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});
