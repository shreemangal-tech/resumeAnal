import type { ParameterResult } from "../domain/types";
import { bandSummary } from "../domain/bandSummary";

export function ScoreStrip({ parameters }: { parameters: ParameterResult[] }) {
  return (
    <div className="score-strip-region">
      <p className="score-strip-help">All 12 marks · scroll horizontally to review</p>
      <div className="score-strip" aria-label="Resume audit marks" tabIndex={0}>
        {parameters.map((parameter, index) => {
          const band = bandSummary(parameter);
          return <div className="score-cell" key={parameter.displayName}>
            <span className="score-index">{String(index + 1).padStart(2, "0")}</span>
            <strong>{parameter.displayName}</strong>
            <span className="score-band">{band.label} · {band.followed}/{band.total} followed</span>
            <span className="score-mark">{parameter.awardedScore}<small>/{parameter.maxScore}</small></span>
          </div>;
        })}
      </div>
    </div>
  );
}
