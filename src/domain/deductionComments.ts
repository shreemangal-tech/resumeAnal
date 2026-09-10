import type { ParameterResult } from "./types";

/**
 * Returns only failed rubric points that came from the source workbook.
 * Do not add generated explanations or evidence here: this text is used
 * directly in the UI tooltip and Excel cell notes.
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
