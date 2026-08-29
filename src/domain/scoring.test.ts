import { describe, expect, it } from "vitest";
import { scoreParameter } from "./scoring";
import type { CriterionResult, CriterionStatus } from "./types";
import { rubric } from "./rubric";

const criteria = (statuses: CriterionStatus[]): CriterionResult[] => statuses.map((status, index) => ({ criterionText: `criterion ${index}`, status }));

describe("source-specific scoring", () => {
  const expectedScoresByFailed = [
    [3, 2, 2, 1, 1, 0, 0],
    [3, 2, 2, 1, 1, 0, 0, 0],
    [3, 2, 1, 0],
    [3, 2, 1, 0],
    [3, 2, 1, 0],
    [3, 2, 1, 1, 0],
    [3, 2, 1, 0],
    [3, 2, 1, 0, 0],
    [3, 2, 1, 0, 0, 0, 0],
    [3, 2, 1, 0, 0, 0],
    [3, 2, 2, 1, 1, 0],
    [6, 4, 4, 2, 0],
  ] as const;

  const bandCases = [
    { full: 0, satisfactory: 1, average: 3, dissatisfactory: 6 },
    { full: 0, satisfactory: 1, average: 3, dissatisfactory: 7 },
    { full: 0, satisfactory: 1, average: 2, dissatisfactory: 3 },
    { full: 0, satisfactory: 1, average: 2, dissatisfactory: 3 },
    { full: 0, satisfactory: 1, average: 2, dissatisfactory: 3 },
    { full: 0, satisfactory: 1, average: 2, dissatisfactory: 4 },
    { full: 0, satisfactory: 1, average: 2, dissatisfactory: 3 },
    { full: 0, satisfactory: 1, average: 2, dissatisfactory: 4 },
    { full: 0, satisfactory: 1, average: 2, dissatisfactory: 6 },
    { full: 0, satisfactory: 1, average: 2, dissatisfactory: 5 },
    { full: 0, satisfactory: 1, average: 3, dissatisfactory: 5 },
    { full: 0, satisfactory: 1, average: 3, dissatisfactory: 4 },
  ] as const;

  it.each(rubric.map((parameter, index) => [index, parameter.parameter] as const))(
    "applies all four exact source bands for parameter %i: %s",
    (index) => {
      const parameter = rubric[index];
      const counts = bandCases[index];
      const statuses = (failed: number): CriterionStatus[] => parameter.criteriaList.map((_, criterionIndex) => criterionIndex < failed ? "not_followed" : "followed");
      expect(scoreParameter(index, criteria(statuses(counts.full))).score).toBe(parameter.scores.highly_satisfactory);
      expect(scoreParameter(index, criteria(statuses(counts.satisfactory))).score).toBe(parameter.scores.satisfactory);
      expect(scoreParameter(index, criteria(statuses(counts.average))).score).toBe(parameter.scores.average);
      expect(scoreParameter(index, criteria(statuses(counts.dissatisfactory))).score).toBe(parameter.scores.dissatisfactory);
    },
  );

  it("applies the Trainings and Projects 6/4/2/0 bands", () => {
    expect(scoreParameter(11, criteria(["followed", "followed", "followed", "followed"])).score).toBe(6);
    expect(scoreParameter(11, criteria(["not_followed", "followed", "followed", "followed"])).score).toBe(4);
    expect(scoreParameter(11, criteria(["not_followed", "not_followed", "not_followed", "followed"])).score).toBe(2);
    expect(scoreParameter(11, criteria(["not_followed", "not_followed", "not_followed", "not_followed"])).score).toBe(0);
  });

  it("uses the workbook's Satisfactory one-or-two-failure rule for Formatting", () => {
    const resolution = scoreParameter(1, criteria(["followed", "followed", "followed", "followed", "followed", "not_followed", "not_followed"]));
    expect(resolution.score).toBe(2);
  });

  it.each(rubric.map((parameter, index) => [index, parameter.parameter] as const))(
    "maps every possible failed-check count for parameter %i: %s",
    (index) => {
      const parameter = rubric[index];
      const actual = parameter.criteriaList.map((_, failed) => {
        const statuses: CriterionStatus[] = parameter.criteriaList.map((__, criterionIndex) => criterionIndex < failed ? "not_followed" : "followed");
        return scoreParameter(index, criteria(statuses)).score;
      });
      const allFailed = parameter.criteriaList.map(() => "not_followed" as const);
      actual.push(scoreParameter(index, criteria(allFailed)).score);
      expect(actual).toEqual(expectedScoresByFailed[index]);
    },
  );

  it("rejects a check count that does not exactly match the workbook", () => {
    expect(() => scoreParameter(0, criteria(["followed", "followed", "followed"]))).toThrow(/exactly 6 source checks/);
  });

  it("strictly assigns undefined intermediate failure counts to the lower workbook band", () => {
    expect(scoreParameter(0, criteria(["not_followed", "not_followed", "not_followed", "not_followed", "not_followed", "followed"])).score).toBe(0);
    expect(scoreParameter(7, criteria(["not_followed", "not_followed", "not_followed", "followed"])).score).toBe(0);
    expect(scoreParameter(8, criteria(["not_followed", "not_followed", "not_followed", "followed", "followed", "followed"])).score).toBe(0);
    expect(scoreParameter(9, criteria(["not_followed", "not_followed", "not_followed", "followed", "followed"])).score).toBe(0);
  });
});
