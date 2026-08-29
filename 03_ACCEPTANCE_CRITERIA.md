# Acceptance Criteria — Resume Audit

These acceptance criteria are derived only from the `Resume` and `Requirements` sheets.

## Global Acceptance

- [ ] The app audits exactly 12 resume parameters.
- [ ] Total possible score is exactly 39.
- [ ] The parameter order matches the Requirements sheet.
- [ ] Marks are displayed horizontally only.
- [ ] Strict marking is used.
- [ ] Proper feedback is shown where marks are deducted.
- [ ] Audit logic maps to the source rubric.
- [ ] Feedback is written in a human-reviewer style.
- [ ] Every parameter has a copy/paste button.
- [ ] No unnecessary/non-rubric deduction is possible.
- [ ] A reviewer can trace each deduction to a source criterion and resume evidence.
- [ ] Writing/WRITEX is not included.

## Parameter-Level Acceptance

For every parameter below, tests must cover all four source bands and use the exact source criteria in `resume-rubric.json`.

### 1. Visual Appeal — 3/2/1/0
- [ ] Tests the exact Highly Satisfactory criteria.
- [ ] Applies the exact Satisfactory wording.
- [ ] Applies the exact Average wording.
- [ ] Applies the exact Dissatisfactory wording.

### 2. Formatting (ATS) — 3/2/1/0
- [ ] Tests the exact Highly Satisfactory criteria.
- [ ] Applies the exact Satisfactory wording.
- [ ] Applies the exact Average wording.
- [ ] Applies the exact Dissatisfactory wording exactly as stored; do not silently rewrite its threshold.

### 3. Organisation of Data — 3/2/1/0
- [ ] Tests distinct headings.
- [ ] Tests strict reverse chronological order for the listed sections.
- [ ] Tests orphaned/miscategorized entries.

### 4. Personal Details — 3/2/1/0
- [ ] Tests full name presentation.
- [ ] Tests phone/LinkedIn/portfolio information as specified.
- [ ] Tests professional email requirement.

### 5. Headings — 3/2/1/0
- [ ] Tests standard industry-recognized labels.
- [ ] Tests content relevance under headings.
- [ ] Tests missing required headings.

### 6. Career Objective — 3/2/1/0
- [ ] Tests 2–3 sentences.
- [ ] Tests explicit target role/domain.
- [ ] Tests one specific skill/strength.
- [ ] Tests the listed generic/templated phrases.
- [ ] Does not fabricate the actual target JD.

### 7. Education — 3/2/1/0
- [ ] Tests terminology.
- [ ] Tests institution, board/university, year, CGPA/percentage for every entry.
- [ ] Tests degree-name spelling-out requirement.

### 8. Extra-Curricular / Academic Activities — 3/2/1/0
- [ ] Tests relevant activities.
- [ ] Tests achievements and level.
- [ ] Tests important achievements first.
- [ ] Tests impact/results.

### 9. Interpersonal Skills — 3/2/1/0
- [ ] Tests unique-personality wording.
- [ ] Tests category organization/relevance/no overcrowding.
- [ ] Tests against abstract standalone soft skills.
- [ ] Tests evidence/examples for major skills.
- [ ] Tests applied scenarios.
- [ ] Tests concise supporting evidence.

### 10. Interests / Hobbies — 3/2/1/0
- [ ] Tests 3–4 specific meaningful interests.
- [ ] Tests genuine-discussion requirement only where evidence permits.
- [ ] Tests sustained involvement.
- [ ] Tests transferable qualities.
- [ ] Tests concise/relevant/well-written/value-add requirement.

### 11. Grammatical Accuracy and Punctuation — 3/2/1/0
- [ ] Tests spelling.
- [ ] Tests grammar.
- [ ] Tests tense consistency.
- [ ] Tests the listed informal words.
- [ ] Does not fabricate industry/JD keywords when no JD is available.
- [ ] Tests action verb + impact/result for work bullets.

### 12. Trainings and Projects — 6/4/2/0
- [ ] Tests time-order format consistency.
- [ ] Tests duration for every entry.
- [ ] Tests role, technology/specialization, and learning/outcome for every entry.
- [ ] Tests at least one quantifiable result where applicable.
- [ ] Applies 6/4/2/0 bands exactly as stated in the source.

## Feedback Acceptance

For each deduction:
- [ ] The feedback names the failed source requirement.
- [ ] The feedback is specific to evidence found/missing in the resume.
- [ ] The feedback does not add another criterion.
- [ ] The feedback does not use generic motivational filler.
- [ ] Copying a parameter copies that parameter's audit content.

## Regression Gate

A pull request fails acceptance if it:
- changes the maximum score from 39;
- adds or removes a resume parameter;
- changes parameter order;
- introduces a new deduction rule;
- includes WriteX scoring in the resume result;
- replaces source scoring with an invented universal threshold;
- adds an extra product feature without an approved requirement.
