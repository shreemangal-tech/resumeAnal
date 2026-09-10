import type { ParameterResult } from "./types";

/**
 * Returns only failed rubric points that came from the source workbook.
 * Generated evidence, rewritten feedback, band labels, and other app text
 * are intentionally excluded from UI and Excel deduction comments.
 */
export function deductionComments(parameter: ParameterResult): string[] {
  return parameter.criteria
    .filter((criterion) => criterion.status === "not_followed")
    .map((criterion) => criterion.criterionText.trim())
    .filter(Boolean);
}

export function deductionCommentText(parameter: ParameterResult): string {
  return deductionComments(parameter).join("\n");
}
