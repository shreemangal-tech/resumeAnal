# Resume Audit Website — Development Plan

## 1. Goal

Build a resume-audit website that accepts a resume and audits it against the exact rubric in `01_SOURCE_OF_TRUTH.md` / `resume-rubric.json`.

The system must not introduce any audit parameter, scoring rule, or result requirement that is not present in the source workbook.

## 2. V1 Scope

### Input
- Resume file upload.

The Excel workbook does **not** define user accounts, payment, saved history, job matching, resume rewriting, admin dashboards, or other product features. Do not add them.

### Audit
Audit exactly these 12 parameters, in this order:

1. Visual Appeal — 3
2. Formatting (ATS) — 3
3. Organisation of Data — 3
4. Personal Details / Personal Information — 3
5. Headings — 3
6. Career Objective — 3
7. Education — 3
8. Extra-Curricular / Academic Activities — 3
9. Interpersonal Skills — 3
10. Interests / Hobbies — 3
11. Grammatical Accuracy and Punctuation — 3
12. Trainings and Projects — 6

Maximum total: **39**.

### Result
- Marks displayed in **horizontal format only**, in the workbook's order.
- Strict marking.
- Proper feedback wherever marks are deducted.
- Audit performed according to the rubric parameters.
- Feedback must read like a human audit, not generic AI prose.
- Every parameter must have a copy/paste button.
- No unnecessary marking/deductions.
- Result must be clear enough to be re-audited by the quality team.

## 3. Architecture Constraint

For V1, keep the application frontend-first and do not add a database or traditional backend unless a later requirement explicitly needs one.

The implementation must keep three concerns separate:

1. **Resume extraction** — reads evidence from the uploaded resume.
2. **Rubric evaluation** — maps evidence to the exact source criteria.
3. **Result rendering** — displays horizontal marks and deduction feedback.

The scoring logic must not be embedded directly inside UI components.

## 4. Required Application States

### A. Upload
- User selects a resume file.
- System validates that the file can be read.
- User starts the audit.

### B. Processing
- Extract resume content and formatting evidence.
- Evaluate each of the 12 rubric parameters.
- Store evidence for each criterion.
- Calculate the category score according to the exact source wording.

### C. Result
- Display all 12 marks horizontally.
- Display total out of 39.
- For each parameter, display:
  - parameter name;
  - awarded mark;
  - feedback where marks were deducted;
  - copy/paste button.

Do not add extra score types such as a percentage, ATS percentage, star rating, job-match score, or another overall grade unless the product owner explicitly adds that requirement later.

## 5. Data Model

Each parameter result should keep traceable evidence:

```ts
type CriterionResult = {
  criterionText: string;
  status: "followed" | "not_followed" | "not_determinable";
  evidence?: string;
};

type ParameterResult = {
  parameter: string;
  maxScore: number;
  awardedScore: number | null;
  criteria: CriterionResult[];
  feedback: string[];
};
```

`not_determinable` is for a source criterion that cannot be proved from the uploaded resume alone. It must not silently be treated as passed or failed.

## 6. Rubric Engine

Load the rules from `resume-rubric.json`.

For each parameter:

1. Read all source criteria.
2. Test only those criteria for which evidence is available.
3. Retain evidence for every failed check.
4. Apply the workbook's scoring-band wording exactly.
5. Generate feedback only for actual deductions.
6. Never deduct a mark for a rule that is not in the workbook.

Do not replace the workbook's band definitions with a universal failure-count formula. Some rows use different wording, and the source text is authoritative.

## 7. Exact-Source Ambiguities

The workbook contains criteria that refer to information not necessarily available from a resume upload alone.

Examples explicitly present in the workbook:
- Career Objective: “Trainer must have reviewed against the actual target JD.”
- Grammatical Accuracy and Punctuation: “At least 3 industry/JD keywords naturally integrated.”

The current resume-upload scope does not provide a target JD.

Therefore:
- do not invent a target JD;
- do not infer a JD from the resume;
- do not automatically pass or fail a JD-dependent criterion without the required source;
- surface the criterion internally as `not_determinable` until the product owner defines how the JD is supplied.

This is not a new feature; it is a guard against fabricating an audit result.

## 8. Feedback Rules

Feedback must be criterion-specific.

Good:
> LinkedIn username is not hyperlinked with a URL.

Bad:
> Your resume could be improved to make it more professional.

For every deduction:
- state what source requirement was not followed;
- state the evidence found or missing;
- keep wording concise and reviewer-like;
- do not add unrelated advice.

If a parameter receives full marks, feedback about deductions is not required by the workbook.

## 9. UI Requirements

### Horizontal Marks
Use the exact `Requirements` sheet order:

Visual Appeal → Formatting (ATS) → Organisation of Data → Personal Information → Headings → Career Objective → Education → Extra-Curricular/Academic Activities → Interpersonal Skills → Interests/Hobbies → Grammatical Accuracy and Punctuation → Trainings and Projects.

### Parameter Feedback
Each parameter needs its own feedback area and **Copy** button.

The copy action must copy that parameter's audit content, not the whole page.

## 10. Development Sequence

### Phase 1 — Source Configuration
- Add `resume-rubric.json`.
- Add TypeScript types for rubric and audit output.
- Ensure the maximum total resolves to 39.

### Phase 2 — Resume Extraction
Extract the evidence required by the source rubric, including where technically available:
- page count;
- text;
- sections/headings;
- order of entries/dates;
- name/contact/link information;
- education entries;
- objective;
- activities;
- skills;
- hobbies/interests;
- training/project entries;
- bullets;
- spelling/grammar evidence;
- layout/font/margin/formatting evidence.

Do not collect data unrelated to the rubric.

### Phase 3 — Parameter Evaluators
Implement one evaluator per rubric parameter. Keep them independent so one parameter cannot accidentally change another parameter's mark.

### Phase 4 — Scoring
Implement the exact four bands for every parameter from `resume-rubric.json`.

### Phase 5 — Feedback
Generate short feedback for criteria responsible for deductions.

### Phase 6 — Result UI
- horizontal marks;
- total /39;
- 12 parameter sections;
- copy button at every parameter.

### Phase 7 — QA
For every parameter:
- verify a full-mark case;
- verify the satisfactory band;
- verify the average band;
- verify the dissatisfactory band;
- verify that only source criteria can cause deductions;
- verify evidence is recorded for each deduction.

## 11. Definition of Done

V1 is complete only when:

- [ ] Exactly 12 resume parameters are audited.
- [ ] Maximum total is 39.
- [ ] Scores follow the workbook wording.
- [ ] Marks appear horizontally in the exact required order.
- [ ] Strict marking is applied.
- [ ] Every deduction has proper feedback.
- [ ] Feedback is concise and human-reviewer-like.
- [ ] Every parameter has a copy/paste button.
- [ ] No non-rubric deduction is possible.
- [ ] Results can be re-audited using retained criterion evidence.
- [ ] The Writing/WRITEX rubric has not been added to the resume audit.
- [ ] No extra product feature has been added without a new requirement.
