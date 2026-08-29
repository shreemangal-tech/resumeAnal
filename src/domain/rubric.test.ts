import { describe, expect, it } from "vitest";
import { DISPLAY_NAMES, MAXIMUM_TOTAL, rubric } from "./rubric";

describe("source rubric invariants", () => {
  it("keeps exactly 12 parameters in the Requirements-sheet order", () => {
    expect(rubric).toHaveLength(12);
    expect(rubric.map((parameter) => parameter.displayName)).toEqual([...DISPLAY_NAMES]);
  });

  it("keeps the maximum score at 39", () => {
    expect(rubric.reduce((sum, parameter) => sum + parameter.maxScore, 0)).toBe(MAXIMUM_TOTAL);
  });

  it("does not include the Writing/WRITEX rubric", () => {
    expect(rubric.map((parameter) => parameter.parameter).join(" ")).not.toMatch(/WRITEX|TASK RESPONSE|LEXICAL RESOURCE/i);
  });

  it("parses only source bullets, never rubric preambles", () => {
    expect(rubric.map((parameter) => parameter.criteriaList.length)).toEqual([6, 7, 3, 3, 3, 4, 3, 4, 6, 5, 5, 4]);
    expect(rubric.flatMap((parameter) => parameter.criteriaList).every((criterion) => !criterion.startsWith("ALL of the following"))).toBe(true);
  });
});
