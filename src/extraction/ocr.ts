import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { cleanOcrText } from "./textQuality";

export type OcrProgress = {
  pageNumber: number;
  pageCount: number;
};

export type OcrDocumentResult = {
  pages: Map<number, string>;
  confidence: number | null;
};

type PositionedOcrBlock = {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};

export function textFromOcrBlocks(blocks: PositionedOcrBlock[] | null, pageWidth: number, pageHeight: number, fallback: string): string {
  const readable = (blocks ?? []).filter((block) => block.text.trim().length > 0);
  if (readable.length < 4) return cleanOcrText(fallback);

  // Tesseract's plain text can merge headings that share a baseline across a
  // two-column resume. Reading detected blocks column-by-column keeps each
  // heading with its own content and produces useful section evidence.
  const prelude = readable.filter((block) => block.bbox.y0 < pageHeight * 0.18);
  const body = readable.filter((block) => block.bbox.y0 >= pageHeight * 0.18);
  const left = body.filter((block) => block.bbox.x0 < pageWidth * 0.38 && block.bbox.x1 <= pageWidth * 0.62);
  const right = body.filter((block) => !left.includes(block));
  const isTwoColumn = left.length >= 2 && right.length >= 2;
  const byPosition = (a: PositionedOcrBlock, b: PositionedOcrBlock) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0;
  const ordered = isTwoColumn
    ? [...prelude.sort(byPosition), ...left.sort(byPosition), ...right.sort(byPosition)]
    : readable.sort(byPosition);

  return cleanOcrText(ordered.map((block) => block.text).join("\n"));
}

export async function extractPdfPagesWithOcr(
  document: PDFDocumentProxy,
  pageNumbers: number[],
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrDocumentResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  await worker.setParameters({ preserve_interword_spaces: "1", user_defined_dpi: "300" });
  const pages = new Map<number, string>();
  const confidences: number[] = [];

  try {
    for (const pageNumber of pageNumbers) {
      onProgress?.({ pageNumber, pageCount: document.numPages });
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 3 });
      const canvas = window.document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("The scanned resume could not be rendered for reading.");

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      try {
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const recognized = await worker.recognize(canvas, {}, { blocks: true });
        pages.set(pageNumber, textFromOcrBlocks(recognized.data.blocks, canvas.width, canvas.height, recognized.data.text));
        if (Number.isFinite(recognized.data.confidence)) confidences.push(recognized.data.confidence);
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }
  } finally {
    await worker.terminate();
  }

  return {
    pages,
    confidence: confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : null,
  };
}
