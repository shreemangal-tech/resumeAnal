import { useState } from "react";
import type { ParameterResult } from "../domain/types";

const deductionComments = (parameter: ParameterResult) =>
  parameter.criteria
    .filter((criterion) => criterion.status === "not_followed")
    .map((criterion) => criterion.criterionText.trim())
    .filter(Boolean);

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

export function ParameterCard({ parameter, index }: { parameter: ParameterResult; index: number }) {
  const [copied, setCopied] = useState(false);
  const comments = deductionComments(parameter);

  async function copyMark() {
    const didCopy = await writeClipboard(String(parameter.awardedScore));
    if (!didCopy) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className="parameter-card">
      <header>
        <div>
          <span className="eyebrow">Parameter {String(index + 1).padStart(2, "0")}</span>
          <h3>{parameter.parameter}</h3>
        </div>
        <div className="score-copy-wrap card-score-wrap">
          <button
            type="button"
            className="card-score-button"
            onClick={copyMark}
            aria-label={`Copy ${parameter.displayName} mark ${parameter.awardedScore}`}
          >
            <span className="card-score">{parameter.awardedScore}<small>/{parameter.maxScore}</small></span>
            <span className="score-copy-hint">{copied ? "Copied" : "Click to copy"}</span>
          </button>
          <div className="score-comment-tooltip card-comment-tooltip" role="tooltip">
            <strong>Deduction comment</strong>
            {comments.length > 0 ? comments.map((comment) => <p key={comment}>{comment}</p>) : <p>No marks deducted.</p>}
          </div>
        </div>
      </header>

      {comments.length > 0 && (
        <div className="sheet-comments">
          <span className="eyebrow">Why marks were deducted</span>
          {comments.map((comment) => <p key={comment}>{comment}</p>)}
        </div>
      )}
    </article>
  );
}
