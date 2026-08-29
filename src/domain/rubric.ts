import source from "../../resume-rubric.json";

export const MAXIMUM_TOTAL = 39 as const;

export const DISPLAY_NAMES = source.display_order;

export type RubricParameter = (typeof source.parameters)[number];

function splitCriteria(text: string): string[] {
  const parts = text.split(/\n?•\s*/);
  // The text before the first bullet is a rubric preamble, not an auditable criterion.
  return parts.slice(1).map((item) => item.trim()).filter(Boolean);
}

export const rubric = source.parameters.map((parameter, index) => ({
  ...parameter,
  displayName: DISPLAY_NAMES[index],
  maxScore: Math.max(...Object.values(parameter.scores)),
  criteriaList: splitCriteria(parameter.criteria.highly_satisfactory),
}));

if (source.maximum_total_score !== MAXIMUM_TOTAL) {
  throw new Error("Source rubric maximum must remain 39.");
}
if (rubric.length !== 12 || DISPLAY_NAMES.length !== 12) {
  throw new Error("Resume Audit V1 must contain exactly 12 parameters.");
}
