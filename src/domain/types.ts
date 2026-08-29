export type CriterionStatus = "followed" | "not_followed";

export type CriterionResult = {
  criterionText: string;
  status: CriterionStatus;
  evidence?: string;
};

export type ParameterResult = {
  parameter: string;
  displayName: string;
  maxScore: number;
  awardedScore: number;
  criteria: CriterionResult[];
  feedback: string[];
  scoringNote?: string;
};

export type ExtractionMethod = "pdf-text" | "pdf-ocr" | "docx" | "txt";

export type PageExtraction = {
  pageNumber: number;
  method: "text" | "ocr";
  text: string;
};

export type ResumeEvidence = {
  fileName: string;
  fileType: string;
  extractionMethod?: ExtractionMethod;
  ocrConfidence?: number | null;
  pageExtractions?: PageExtraction[];
  text: string;
  pageCount: number | null;
  lines: string[];
  hyperlinks: string[];
  embeddedHyperlinks: string[];
  headings: string[];
  headingCandidates?: string[];
  bullets: string[];
  formatting: {
    fontFamilies: string[] | null;
    bodyFontSizes: number[] | null;
    marginsInches: number[] | null;
    hasTables: boolean | null;
    hasImages: boolean | null;
    hasTextBoxes: boolean | null;
    hasColumns: boolean | null;
    hasBorders: boolean | null;
    hasShading: boolean | null;
    usesNonStandardColors: boolean | null;
    nameEmphasized: boolean | null;
  };
};

export type AuditResult = {
  sourceFileName: string;
  extractionMethod?: ExtractionMethod;
  parameters: ParameterResult[];
  awardedTotal: number;
  maximumTotal: 39;
  isComplete: boolean;
};
