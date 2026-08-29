import type { CriterionResult } from "./types";
import { rubric } from "./rubric";

type ScoreResolution = { score: number };

export function scoreParameter(parameterIndex: number, criteria: CriterionResult[]): ScoreResolution {
  const scores = rubric[parameterIndex]?.scores;
  if (!scores) throw new Error(`Source rubric parameter ${parameterIndex + 1} was not found.`);

  const failed = criteria.filter((criterion) => criterion.status === "not_followed").length;
  if (failed === 0) return { score: scores.highly_satisfactory };

  switch (parameterIndex) {
    case 0:
    case 1:
    case 10:
      if (failed <= 2) return { score: scores.satisfactory };
      if (failed <= 4) return { score: scores.average };
      return { score: scores.dissatisfactory };
    case 5:
      if (failed === 1) return { score: scores.satisfactory };
      if (failed <= 3) return { score: scores.average };
      return { score: scores.dissatisfactory };
    case 11:
      if (failed <= 2) return { score: scores.satisfactory };
      if (failed === 3) return { score: scores.average };
      return { score: scores.dissatisfactory };
    default:
      if (failed === 1) return { score: scores.satisfactory };
      if (failed === 2) return { score: scores.average };
      return { score: scores.dissatisfactory };
  }
}
