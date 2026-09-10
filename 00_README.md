# Resume Audit Codex Pack

This folder is prepared from `Parameters_SOURCE.xlsx` for building the Resume Audit V1 with Codex.

## Files

- `Parameters_SOURCE.xlsx` — original workbook supplied by the product owner.
- `01_SOURCE_OF_TRUTH.md` — exact Resume + Requirements rubric content to follow.
- `resume-rubric.json` — machine-readable version of the same resume rubric.
- `02_DEVELOPMENT_PLAN.md` — implementation plan constrained to the source requirements.
- `03_ACCEPTANCE_CRITERIA.md` — QA and regression criteria.
- `04_CODEX_INSTRUCTIONS.md` — guardrails for Codex so it does not invent features/rules.
- `05_CODEX_START_PROMPT.md` — ready-to-paste starting prompt for Codex.

## Scope Decision

The workbook contains three sheets:

1. Resume
2. Writing
3. Requirements

The current product is a **Resume Audit website**, so `Resume` and `Requirements` are the source for implementation. `Writing` contains a separate **WRITEX (10)** rubric and is not part of this resume-audit V1.

## Source Priority

If any file conflicts with the original workbook, the original workbook wins.

Do not add any product feature or scoring rule that is not explicitly approved.

Deduction comments shown in the app or written as Excel cell notes must use only failed criterion text from the source rubric. Generated evidence or rewritten explanations must not be used as deduction comments.

## Excel output

- Clicking an individual mark copies only that awarded number.
- The two-row copy action pastes marks and source-sheet deduction comments into aligned Excel rows.
- A normal text clipboard paste cannot create native Excel hover notes. Use **Download Excel with hover comments** to create an `.xlsx` file where deducted mark cells contain native Excel notes sourced only from failed rubric points.
- Full-mark cells do not receive invented comments.

## Run the website

On Windows, double-click `START_APP.cmd`. Keep the terminal window open while using the site.

Or run it manually:

```powershell
npm install
npm run dev
```

Then open `http://127.0.0.1:5173/` in a browser. Do not open `index.html` directly; the Vite development server is required.
