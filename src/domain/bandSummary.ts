import type { ParameterResult } from "./types";

export function bandSummary(parameter: ParameterResult) {
  const labelsByScore = parameter.maxScore === 6
    ? new Map([[6, "Highly Satisfactory"], [4, "Satisfactory"], [2, "Average"], [0, "Dissatisfactory"]])
    : new Map([[3, "Highly Satisfactory"], [2, "Satisfactory"], [1, "Average"], [0, "Dissatisfactory"]]);
  const followed = parameter.criteria.filter((criterion) => criterion.status === "followed").length;
  const notFollowed = parameter.criteria.length - followed;
  return {
    label: labelsByScore.get(parameter.awardedScore) ?? "Workbook band",
    followed,
    notFollowed,
    total: parameter.criteria.length,
  };
}
