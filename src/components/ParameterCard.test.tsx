import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ParameterCard } from "./ParameterCard";
import type { ParameterResult } from "../domain/types";

describe("per-parameter mark copy", () => {
  it("copies only the awarded mark and shows only source rubric deduction comments", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    const parameter: ParameterResult = {
      parameter: "Education",
      displayName: "Education (3)",
      maxScore: 3,
      awardedScore: 2,
      feedback: ["Generated feedback that must not be shown."],
      criteria: [
        {
          criterionText: "Year present for every entry.",
          status: "not_followed",
          evidence: "One entry has no year.",
        },
      ],
    };

    render(<ParameterCard parameter={parameter} index={6} />);

    expect(screen.getAllByText("Year present for every entry.").length).toBeGreaterThan(0);
    expect(screen.queryByText("Generated feedback that must not be shown.")).not.toBeInTheDocument();
    expect(screen.queryByText("One entry has no year.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Source checks/)).not.toBeInTheDocument();
    expect(screen.queryByText("Highly Satisfactory")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy Education (3) mark 2" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("2"));
    expect(screen.getByText("Copied")).toBeInTheDocument();
  });

  it("shows no deduction comment when full marks are awarded", () => {
    const parameter: ParameterResult = {
      parameter: "Education",
      displayName: "Education (3)",
      maxScore: 3,
      awardedScore: 3,
      feedback: [],
      criteria: [
        {
          criterionText: "Year present for every entry.",
          status: "followed",
          evidence: "2025",
        },
      ],
    };

    render(<ParameterCard parameter={parameter} index={6} />);

    expect(screen.getByText("No marks deducted.")).toBeInTheDocument();
    expect(screen.queryByText("Year present for every entry.")).not.toBeInTheDocument();
  });
});
