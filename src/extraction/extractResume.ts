import type { ExtractionMethod, PageExtraction, ResumeEvidence } from "../domain/types";
import { extractPdfPagesWithOcr } from "./ocr";
import { hasUsableResumeText, separateEmbeddedOcrHeadings } from "./textQuality";

const headingLabels = new Set([
  "objective", "career objective", "professional summary", "summary", "profile", "contact", "education", "experience",
  "work experience", "professional experience", "employment history", "projects", "project",
  "selected company projects", "company projects", "academic projects", "open source projects", "open source engineering",
  "personal open source engineering", "skills", "technical skills", "soft skills", "interpersonal skills",
  "certifications", "linkedin certificates", "activities", "academic activities", "extra curricular activities",
  "extracurricular activities", "achievements", "training", "trainings", "interests", "hobbies",
  "interests and hobbies", "languages",
]);

const normalizeHeading = (line: string) => {
  const compactLetterSpacing = line.replace(/\b(?:[A-Za-z]\s+){3,}[A-Za-z]\b/g, (value) => value.replace(/\s+/g, ""));
  return compactLetterSpacing.toLowerCase().replaceAll("0", "o").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
};
const cleanLines = (text: string) => text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);

function looksLikeSectionHeading(line: string): boolean {
  if (line.length > 80 || /@|https?:|www\.|\b(?:19|20)\d{2}\b/.test(line)) return false;
  const letters = line.replace(/[^A-Za-z]/g, "");
  const words = line.match(/[A-Za-z]+/g) ?? [];
  return letters.length >= 3 && words.length <= 8 && letters === letters.toUpperCase();
}

type ExtractedFile = {
  text: string;
  pageCount: number | null;
  hyperlinks: string[];
  formatting: ResumeEvidence["formatting"];
  extractionMethod: ExtractionMethod;
  ocrConfidence?: number | null;
  pageExtractions?: PageExtraction[];
};

export type ExtractionProgress = { message: string };

const emptyFormatting = (): ResumeEvidence["formatting"] => ({
  fontFamilies: null,
  bodyFontSizes: null,
  marginsInches: null,
  hasTables: null,
  hasImages: null,
  hasTextBoxes: null,
  hasColumns: null,
  hasBorders: null,
  hasShading: null,
  usesNonStandardColors: null,
  nameEmphasized: null,
});

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function dominantFontSizes(values: number[]): number[] {
  if (!values.length) return [];
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const highestCount = Math.max(...counts.values());
  return [...counts.entries()]
    .filter(([, count]) => count >= highestCount * 0.35)
    .map(([size]) => size)
    .sort((a, b) => a - b);
}

async function extractPdf(file: File, onProgress?: (progress: ExtractionProgress) => void): Promise<ExtractedFile> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  const pageExtractions: PageExtraction[] = [];
  const pagesNeedingOcr: number[] = [];
  const fontFamilies: string[] = [];
  const fontSizes: number[] = [];
  const hyperlinks: string[] = [];
  let imageCount = 0;
  let vectorShapeCount = 0;
  let shadingCount = 0;
  let usesNonStandardColors = false;
  let firstLineSize: number | null = null;

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.filter((item): item is import("pdfjs-dist/types/src/display/api").TextItem => "str" in item && Boolean(item.str.trim()));
      const rows: Array<{ y: number; items: typeof items }> = [];

      for (const item of items) {
        const y = item.transform[5];
        let row = rows.find((candidate) => Math.abs(candidate.y - y) <= 2.5);
        if (!row) {
          row = { y, items: [] };
          rows.push(row);
        }
        row.items.push(item);
        const family = content.styles[item.fontName]?.fontFamily;
        if (family) fontFamilies.push(family);
        if (item.height > 0) fontSizes.push(Math.round(item.height * 10) / 10);
      }

      rows.sort((a, b) => b.y - a.y);
      const pageLines = rows.map((row) => row.items.sort((a, b) => a.transform[4] - b.transform[4]).map((item) => item.str.trim()).filter(Boolean).join(" "));
      const pageText = pageLines.join("\n");
      pages.push(pageText);
      if (hasUsableResumeText(pageText)) pageExtractions.push({ pageNumber, method: "text", text: pageText });
      else pagesNeedingOcr.push(pageNumber);
      if (pageNumber === 1 && rows[0]?.items.length) firstLineSize = Math.max(...rows[0].items.map((item) => item.height));

      const annotations = await page.getAnnotations();
      for (const annotation of annotations) {
        if ("url" in annotation && typeof annotation.url === "string") hyperlinks.push(annotation.url);
      }
      const operators = await page.getOperatorList();
      imageCount += operators.fnArray.filter((operator) => [pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageMaskXObject].includes(operator)).length;
      vectorShapeCount += operators.fnArray.filter((operator) => [
        pdfjs.OPS.stroke,
        pdfjs.OPS.closeStroke,
        pdfjs.OPS.fill,
        pdfjs.OPS.eoFill,
        pdfjs.OPS.fillStroke,
        pdfjs.OPS.eoFillStroke,
        pdfjs.OPS.closeFillStroke,
        pdfjs.OPS.closeEOFillStroke,
      ].includes(operator)).length;
      shadingCount += operators.fnArray.filter((operator) => operator === pdfjs.OPS.shadingFill).length;
      operators.fnArray.forEach((operator, index) => {
        if (![pdfjs.OPS.setFillRGBColor, pdfjs.OPS.setStrokeRGBColor].includes(operator)) return;
        const rawArguments = operators.argsArray[index] ?? [];
        const components: number[] = (rawArguments as unknown[]).flatMap((value: unknown): number[] => {
          if (typeof value === "number") return [value];
          if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) {
            return [Number.parseInt(value.slice(1, 3), 16), Number.parseInt(value.slice(3, 5), 16), Number.parseInt(value.slice(5, 7), 16)];
          }
          if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>);
          return [];
        }).slice(0, 3);
        if (components.length !== 3) return;
        const maximum = Math.max(...components);
        const scale = maximum > 1 ? 255 : 1;
        const isBlack = components.every((component) => component <= scale * 0.08);
        const isWhite = components.every((component) => component >= scale * 0.92);
        if (!isBlack && !isWhite) usesNonStandardColors = true;
      });
      page.cleanup();
    }

    let ocrConfidence: number | null = null;
    if (pagesNeedingOcr.length) {
      if (file.size > 10 * 1024 * 1024 || pagesNeedingOcr.length > 5) {
        throw new Error("This scanned resume is too large to process safely. Please upload a smaller PDF or DOCX file.");
      }
      onProgress?.({ message: "Scanned resume detected. Reading text from the document..." });
      const ocr = await extractPdfPagesWithOcr(document, pagesNeedingOcr, ({ pageNumber, pageCount }) => {
        onProgress?.({ message: `Reading scanned page ${pageNumber} of ${pageCount}...` });
      });
      ocrConfidence = ocr.confidence;
      for (const pageNumber of pagesNeedingOcr) {
        const ocrText = ocr.pages.get(pageNumber) ?? "";
        if (!hasUsableResumeText(ocrText)) {
          throw new Error("We could not reliably read the text in this scanned resume. Please upload a clearer PDF or DOCX file.");
        }
        const structuredOcrText = separateEmbeddedOcrHeadings(ocrText);
        pages[pageNumber - 1] = structuredOcrText;
        pageExtractions.push({ pageNumber, method: "ocr", text: structuredOcrText });
      }
    }

    pageExtractions.sort((a, b) => a.pageNumber - b.pageNumber);
    const usedOcr = pagesNeedingOcr.length > 0;
    const sortedSizes = fontSizes.slice().sort((a, b) => a - b);
    const medianSize = sortedSizes.length ? sortedSizes[Math.floor(sortedSizes.length / 2)] : null;
    return {
      text: pages.join("\n\n"),
      pageCount: document.numPages,
      hyperlinks: unique(hyperlinks),
      extractionMethod: usedOcr ? "pdf-ocr" : "pdf-text",
      ocrConfidence,
      pageExtractions,
      formatting: {
        ...emptyFormatting(),
        fontFamilies: usedOcr ? null : unique(fontFamilies),
        bodyFontSizes: usedOcr ? null : dominantFontSizes(fontSizes),
        marginsInches: null,
        hasImages: imageCount > 0,
        hasBorders: vectorShapeCount > 0,
        hasShading: shadingCount > 0,
        usesNonStandardColors,
        nameEmphasized: usedOcr ? null : firstLineSize !== null && medianSize !== null ? firstLineSize >= medianSize * 1.2 : null,
      },
    };
  } finally {
    await loadingTask.destroy();
  }
}

const attribute = (tag: string, name: string) => new RegExp(`${name}="([^"]+)"`, "i").exec(tag)?.[1] ?? null;

async function extractDocx(file: File): Promise<ExtractedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import("mammoth");
  const mammothInput = typeof process !== "undefined" && process.release?.name === "node"
    ? { buffer: new Uint8Array(arrayBuffer) }
    : { arrayBuffer };
  const [{ value: rawText }, { value: html }, fflate] = await Promise.all([
    mammoth.extractRawText(mammothInput as Parameters<typeof mammoth.extractRawText>[0]),
    mammoth.convertToHtml(mammothInput as Parameters<typeof mammoth.convertToHtml>[0]),
    import("fflate"),
  ]);
  const zip = fflate.unzipSync(new Uint8Array(arrayBuffer));
  const htmlDocument = new DOMParser().parseFromString(html, "text/html");
  const structuredLines = [...htmlDocument.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li")]
    .filter((element) => !element.closest("li") || element.tagName.toLowerCase() === "li")
    .map((element) => `${element.tagName.toLowerCase() === "li" ? "• " : ""}${element.textContent?.replace(/\s+/g, " ").trim() ?? ""}`)
    .filter(Boolean);
  const text = structuredLines.length ? structuredLines.join("\n") : rawText;
  const readXml = (path: string) => zip[path] ? fflate.strFromU8(zip[path]) : "";
  const documentXml = readXml("word/document.xml");
  const stylesXml = readXml("word/styles.xml");
  const appXml = readXml("docProps/app.xml");
  const usedStyleIds = unique([...documentXml.matchAll(/<w:pStyle\b[^>]*w:val="([^"]+)"/gi)].map((match) => match[1]));
  const usedStyleXml = usedStyleIds.map((styleId) => [...stylesXml.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>[\s\S]*?<\/w:style>/gi)]
    .find((match) => match[1] === styleId)?.[0] ?? "").join("\n");
  const defaultsXml = stylesXml.match(/<w:docDefaults\b[^>]*>[\s\S]*?<\/w:docDefaults>/i)?.[0] ?? "";
  const formattingXml = `${documentXml}\n${usedStyleXml}\n${defaultsXml}`;

  const fontFamilies = [...formattingXml.matchAll(/<w:rFonts\b[^>]*>/gi)]
    .flatMap((match) => [attribute(match[0], "w:ascii"), attribute(match[0], "w:hAnsi")])
    .filter((value): value is string => Boolean(value));
  const fontSizes = [...formattingXml.matchAll(/<w:sz\b[^>]*w:val="(\d+)"[^>]*\/?\s*>/gi)].map((match) => Number(match[1]) / 2).filter((value) => value > 0);
  const marginTag = documentXml.match(/<w:pgMar\b[^>]*>/i)?.[0] ?? "";
  const marginValues = ["w:top", "w:right", "w:bottom", "w:left"].map((name) => Number(attribute(marginTag, name)) / 1440);
  const marginsInches = marginTag && marginValues.every(Number.isFinite) ? marginValues : null;
  const pageCountMatch = appXml.match(/<Pages>(\d+)<\/Pages>/i);
  const firstParagraph = documentXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/i)?.[0] ?? "";
  const firstParagraphSize = Number(firstParagraph.match(/<w:sz\b[^>]*w:val="(\d+)"/i)?.[1] ?? 0) / 2;
  const sortedSizes = fontSizes.slice().sort((a, b) => a - b);
  const medianSize = sortedSizes.length ? sortedSizes[Math.floor(sortedSizes.length / 2)] : 0;
  const columnTag = documentXml.match(/<w:cols\b[^>]*>/i)?.[0] ?? "";
  const columnCount = Number(attribute(columnTag, "w:num") ?? 1);
  const colors = [...documentXml.matchAll(/<w:color\b[^>]*w:val="([^"]+)"/gi)].map((match) => match[1].toLowerCase());

  return {
    text,
    pageCount: pageCountMatch ? Number(pageCountMatch[1]) : null,
    hyperlinks: unique([...html.matchAll(/href="([^"]+)"/gi)].map((match) => match[1])),
    extractionMethod: "docx",
    formatting: {
      fontFamilies: unique(fontFamilies),
      bodyFontSizes: dominantFontSizes(fontSizes),
      marginsInches,
      hasTables: /<w:tbl\b/i.test(documentXml),
      hasImages: /<w:(?:drawing|pict)\b/i.test(documentXml),
      hasTextBoxes: /<w:txbxContent\b/i.test(documentXml),
      hasColumns: columnCount > 1 || (columnTag ? (documentXml.match(/<w:col\b/gi)?.length ?? 0) > 1 : false),
      hasBorders: /<w:(?:pBdr|tblBorders|pgBorders)\b/i.test(documentXml),
      hasShading: /<w:shd\b/i.test(documentXml),
      usesNonStandardColors: colors.some((color) => !["auto", "000000", "000"].includes(color)),
      nameEmphasized: firstParagraph ? /<w:b(?:\s|\/|>)/i.test(firstParagraph) || (firstParagraphSize > 0 && medianSize > 0 && firstParagraphSize >= medianSize * 1.2) : null,
    },
  };
}

async function extractText(file: File): Promise<ExtractedFile> {
  return { text: await file.text(), pageCount: null, hyperlinks: [], extractionMethod: "txt", formatting: emptyFormatting() };
}

export async function extractResume(file: File, onProgress?: (progress: ExtractionProgress) => void): Promise<ResumeEvidence> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  let extracted: ExtractedFile;
  if (extension === "pdf") extracted = await extractPdf(file, onProgress);
  else if (extension === "docx") extracted = await extractDocx(file);
  else if (extension === "txt") extracted = await extractText(file);
  else throw new Error("Upload a readable PDF, DOCX, or TXT resume.");

  if (!extracted.text.trim()) throw new Error("No readable resume text was found in this file.");

  const lines = cleanLines(extracted.text);
  const headings = lines.filter((line) => headingLabels.has(normalizeHeading(line)));
  const firstKnownHeadingIndex = lines.findIndex((line) => headingLabels.has(normalizeHeading(line)));
  const headingCandidateStart = firstKnownHeadingIndex >= 0 ? firstKnownHeadingIndex : Math.min(2, lines.length);
  const headingCandidates = lines.filter((line, index) => headingLabels.has(normalizeHeading(line)) || (index >= headingCandidateStart && looksLikeSectionHeading(line)));
  const textHyperlinks = extracted.text.match(/https?:\/\/\S+|(?:www\.)\S+|linkedin\.com\/\S+/gi) ?? [];
  const bullets = lines.filter((line) => /^[•●▪◦\-*]\s+/.test(line));

  return {
    fileName: file.name,
    fileType: extension ?? "unknown",
    extractionMethod: extracted.extractionMethod,
    ocrConfidence: extracted.ocrConfidence,
    pageExtractions: extracted.pageExtractions,
    text: extracted.text,
    pageCount: extracted.pageCount,
    lines,
    hyperlinks: unique([...extracted.hyperlinks, ...textHyperlinks]),
    embeddedHyperlinks: extracted.hyperlinks,
    headings,
    headingCandidates: unique(headingCandidates),
    bullets,
    formatting: extracted.formatting,
  };
}
