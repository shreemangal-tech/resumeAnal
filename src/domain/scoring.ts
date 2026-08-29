import type { CriterionResult } from "./types";
import { rubric } from "./rubric";

export type ScoreBand = "highly_satisfactory" | "satisfactory" | "average" | "dissatisfactory";

export type ScoreResolution = {
  score: number;
  band: ScoreBand;
  rule: string;
};

export function scoreParameter(parameterIndex: number, criteria: CriterionResult[]): ScoreResolution {
  const parameter = rubric[parameterIndex];
  if (!parameter) throw new Error(`Source rubric parameter ${parameterIndex + 1} was not found.`);
  if (criteria.length !== parameter.criteriaList.length) {
    throw new Error(`Parameter ${parameterIndex + 1} requires exactly ${parameter.criteriaList.length} source checks; received ${criteria.length}.`);
  }

  const resolve = (band: ScoreBand): ScoreResolution => ({
    score: parameter.scores[band],
    band,
    rule: band === "highly_satisfactory"
      ? "All source checks were followed."
      : parameter.criteria[band],
  });

  const failed = criteria.filter((criterion) => criterion.status === "not_followed").length;
  if (failed === 0) return resolve("highly_satisfactory");

  switch (parameterIndex) {
    case 0:
    case 1:
    case 10:
      if (failed <= 2) return resolve("satisfactory");
      if (failed <= 4) return resolve("average");
      return resolve("dissatisfactory");
    case 5:
      if (failed === 1) return resolve("satisfactory");
      if (failed <= 3) return resolve("average");
      return resolve("dissatisfactory");
    case 11:
      if (failed <= 2) return resolve("satisfactory");
      if (failed === 3) return resolve("average");
      return resolve("dissatisfactory");
    default:
      if (failed === 1) return resolve("satisfactory");
      if (failed === 2) return resolve("average");
      return resolve("dissatisfactory");
  }
}
