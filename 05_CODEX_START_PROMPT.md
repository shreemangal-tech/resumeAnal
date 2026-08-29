# Codex Start Prompt

Use the files in this folder as the complete product specification for the Resume Audit V1.

First read, in order:

1. `01_SOURCE_OF_TRUTH.md`
2. `resume-rubric.json`
3. `02_DEVELOPMENT_PLAN.md`
4. `03_ACCEPTANCE_CRITERIA.md`
5. `04_CODEX_INSTRUCTIONS.md`

Then inspect the existing repository before writing code.

Implement only the requirements defined in those files. Do not invent product features, audit parameters, scoring thresholds, or resume deductions.

Core requirements:
- resume upload and audit;
- exactly 12 Resume-sheet parameters;
- total maximum 39;
- exact source scoring bands;
- marks in horizontal format in the Requirements-sheet order;
- strict marking;
- feedback wherever marks are deducted;
- human-reviewer-style feedback;
- copy/paste button at every parameter;
- no unnecessary marking;
- evidence retained for every deduction;
- do not include the Writing/WRITEX rubric;
- frontend-first V1; do not add a backend/database unless a later approved requirement explicitly needs it.

For any rubric statement that cannot be evaluated from the available resume evidence, do not guess or silently score it. Preserve it as not determinable and report the implementation gap rather than inventing missing context.

Work in small commits/steps. After each scoring-related change, run tests proving the source rubric has not changed.
