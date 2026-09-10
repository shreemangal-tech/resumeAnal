import { useState } from "react";
import { deductionComments } from "../domain/deductionComments";
import type { ParameterResult } from "../domain/types";
import { downloadAuditExcel } from "../exportAuditExcel";

export const excelMarksText = (parameters: ParameterResult[]) =>
  parameters.map((parameter) => parameter.awardedScore).join("\t");

async function writeClipboard(text: string) {
  try {
    if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand?.("copy") ?? false;
    textarea.remove();
    return copied;
  }
}

export function ScoreStrip({ parameters }: { parameters: ParameterResult[] }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function copyForExcel() {
    const copied = await writeClipboard(excelMarksText(parameters));
    setCopyState(copied ? "copied" : "error");
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  async function copyMark(parameter: ParameterResult, index: number) {
    const copied = await writeClipboard(String(parameter.awardedScore));
    if (!copied) return;
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1200);
  }

  return (
    <div className="score-strip-region">
      <div className="score-strip-toolbar">
        <p className="score-strip-help">Copy pastes marks only · download Excel to keep exact sheet comments as hover notes</p>
        <button type="button" className="copy-marks-button" onClick={copyForExcel}>
          {copyState === "copied" ? "Excel marks copied" : copyState === "error" ? "Copy blocked" : "Copy marks for Excel"}
        </button>
        <button type="button" className="copy-marks-button" onClick={() => downloadAuditExcel(parameters)}>
          Download Excel with hover comments
        </button>
      </div>
      <div className="score-strip" aria-label="Resume audit marks" tabIndex={0}>
        {parameters.map((parameter, index) => {
          const comments = deductionComments(parameter);
          return (
            <div className="score-cell" key={parameter.displayName}>
              <span className="score-index">{String(index + 1).padStart(2, "0")}</span>
              <strong>{parameter.displayName}</strong>
              <div className="score-copy-wrap">
                <button
                  type="button"
                  className="score-mark-button"
                  onClick={() => copyMark(parameter, index)}
                  aria-label={`Copy ${parameter.displayName} mark ${parameter.awardedScore}`}
                >
                  <span className="score-mark">{parameter.awardedScore}<small>/{parameter.maxScore}</small></span>
                  <span className="score-copy-hint">{copiedIndex === index ? "Copied" : "Click to copy"}</span>
                </button>
                {comments.length > 0 && (
                  <div className="score-comment-tooltip" role="tooltip">
                    {comments.map((comment) => <p key={comment}>{comment}</p>)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
