import { useState } from "react";
import type { ParameterResult } from "../domain/types";
import { bandSummary } from "../domain/bandSummary";

export const excelMarksText = (parameters: ParameterResult[]) => parameters.map((parameter) => parameter.awardedScore).join("\t");

export function ScoreStrip({ parameters }: { parameters: ParameterResult[] }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  async function copyMarks() {
    const text = excelMarksText(parameters);
    let copied = false;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand?.("copy") ?? false;
      textarea.remove();
    }
    setCopyState(copied ? "copied" : "error");
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  return (
    <div className="score-strip-region">
      <div className="score-strip-toolbar">
        <p className="score-strip-help">12 parameter marks · scroll horizontally to review</p>
        <button type="button" className="copy-marks-button" onClick={copyMarks}>{copyState === "copied" ? "Excel values copied" : copyState === "error" ? "Copy blocked" : "Copy values for Excel"}</button>
      </div>
      <div className="score-strip" aria-label="Resume audit marks" tabIndex={0}>
        {parameters.map((parameter, index) => {
          const band = bandSummary(parameter);
          return <div className="score-cell" key={parameter.displayName}>
            <span className="score-index">{String(index + 1).padStart(2, "0")}</span>
            <strong>{parameter.displayName}</strong>
            <span className="score-maximum">Maximum {parameter.maxScore} marks · {band.total} source checks</span>
            <span className="score-band">{band.label} · {band.followed}/{band.total} checks followed</span>
            <span className="score-mark">{parameter.awardedScore}<small>/{parameter.maxScore} marks</small></span>
          </div>;
        })}
      </div>
    </div>
  );
}
