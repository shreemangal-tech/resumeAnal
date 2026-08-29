import { useState } from "react";
import { bandSummary } from "../domain/bandSummary";
import type { ParameterResult } from "../domain/types";

export function copyAuditText(parameter: ParameterResult) {
  const mark = `${parameter.awardedScore} / ${parameter.maxScore}`;
  const band = bandSummary(parameter);
  const details = parameter.criteria.map((criterion) => `- ${criterion.status.replaceAll("_", " ")}: ${criterion.criterionText}${criterion.evidence ? `\n  Evidence: ${criterion.evidence}` : ""}`).join("\n");
  return `${parameter.displayName}\nMark: ${mark}\nBand: ${band.label}\nCount: ${band.followed} of ${band.total} criteria followed; ${band.notFollowed} not followed\n${details}`;
}

export function ParameterCard({ parameter, index }: { parameter: ParameterResult; index: number }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const band = bandSummary(parameter);
  async function copy() {
    const text = copyAuditText(parameter);
    let didCopy = false;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      didCopy = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      didCopy = document.execCommand?.("copy") ?? false;
      textarea.remove();
    }
    setCopyState(didCopy ? "copied" : "error");
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  return (
    <article className="parameter-card">
      <header>
        <div><span className="eyebrow">Parameter {String(index + 1).padStart(2, "0")}</span><h3>{parameter.parameter}</h3></div>
        <div className="card-actions">
          <span className="card-score">{parameter.awardedScore}<small>/{parameter.maxScore}</small></span>
          <button type="button" className="copy-button" onClick={copy}>{copyState === "copied" ? "Copied" : copyState === "error" ? "Copy blocked" : "Copy audit"}</button>
        </div>
      </header>
      <div className="band-summary">
        <div><strong>{band.label}</strong><span>{band.followed} of {band.total} criteria followed</span></div>
        <p>{band.notFollowed === 0 ? "All criteria followed" : `${band.notFollowed} ${band.notFollowed === 1 ? "criterion" : "criteria"} not followed`} → {parameter.awardedScore}/{parameter.maxScore} under the workbook band.</p>
      </div>
      {parameter.scoringNote && <p className="review-note">{parameter.scoringNote}</p>}
      {parameter.feedback.length > 0 && <div className="feedback"><span className="eyebrow">Deduction feedback</span>{parameter.feedback.map((item) => <p key={item}>{item}</p>)}</div>}
      <details>
        <summary>Review criterion evidence</summary>
        <div className="criteria-list">
          {parameter.criteria.map((criterion) => (
            <div className={`criterion ${criterion.status}`} key={criterion.criterionText}>
              <span className="status-dot" aria-hidden="true" />
              <div><strong>{criterion.status.replaceAll("_", " ")}</strong><p>{criterion.criterionText}</p>{criterion.evidence && <small>{criterion.evidence}</small>}</div>
            </div>
          ))}
        </div>
      </details>
    </article>
  );
}
