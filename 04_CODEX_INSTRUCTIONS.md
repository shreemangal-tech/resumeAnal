# Codex Implementation Instructions — Resume Audit

## Source Priority

Read these files before changing code:

1. `01_SOURCE_OF_TRUTH.md`
2. `resume-rubric.json`
3. `02_DEVELOPMENT_PLAN.md`
4. `03_ACCEPTANCE_CRITERIA.md`

If any implementation idea conflicts with `01_SOURCE_OF_TRUTH.md`, the source-of-truth file wins.

## Non-Negotiable Rules

- Implement only the resume audit.
- Use only the 12 parameters from the Resume sheet.
- Maximum score must remain 39.
- Do not include the Writing/WRITEX rubric.
- Do not add new scoring parameters.
- Do not invent scoring thresholds.
- Do not replace rubric wording with a generic scoring formula.
- Do not add an ATS percentage.
- Do not add job matching.
- Do not add resume rewriting.
- Do not add login, registration, user profiles, saved audits, payments, admin panels, or analytics unless later explicitly requested.
- Do not add a backend/database for V1 unless an explicitly approved requirement requires it.
- Do not fabricate evidence.
- Do not penalize a resume unless a source criterion supports the deduction.
- Store the evidence/reason behind each deduction.
- Marks must be rendered horizontally in the exact source order.
- Every parameter must have its own copy/paste action.
- Feedback must be concise, specific, and human-reviewer-like.

## Implementation Pattern

Keep the following modules separate:

```text
resume extraction
      ↓
structured evidence
      ↓
12 independent rubric evaluators
      ↓
scoring bands from resume-rubric.json
      ↓
deduction feedback
      ↓
horizontal result UI
```

Do not make React/UI components decide scores.

## Required Safety Against Assumptions

If a source criterion cannot be evaluated from available resume evidence, do not guess.

Use a result such as:

```ts
{
  status: "not_determinable",
  reason: "Required source context is not available."
}
```

Two source examples require special care:
- the Career Objective criterion references the actual target JD;
- the Grammar criterion references industry/JD keywords.

Do not invent a JD or add a JD upload field unless the product owner explicitly requests it.

## Change Discipline

Before making a change, state which source requirement it implements.

After making a change:
1. run the relevant unit tests;
2. run the full rubric tests;
3. confirm total maximum is still 39;
4. confirm all 12 horizontal columns are still in the source order;
5. confirm no new audit parameter has appeared.

## Expected Code Boundaries

Recommended logical modules (names may follow the existing repository conventions):

- rubric configuration
- resume parser/extractor
- evidence model
- parameter evaluators
- scoring
- feedback
- result UI
- copy action
- tests

Do not reorganize an existing repository unnecessarily just to match these names.
