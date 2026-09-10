import { useRef, useState } from "react";
import { ScoreStrip } from "./components/ScoreStrip";
import { ParameterCard } from "./components/ParameterCard";
import type { AuditResult } from "./domain/types";
import { evaluateResume } from "./evaluation/evaluateResume";
import { extractResume } from "./extraction/extractResume";

type AppState = "upload" | "processing" | "result";

const readableFileName = (fileName: string) => fileName.replaceAll("_", " ");

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<AppState>("upload");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState("Checking only the approved resume criteria—nothing extra.");

  function selectFile(nextFile: File | null) {
    if (nextFile && !/\.(pdf|docx|txt)$/i.test(nextFile.name)) {
      setFile(null);
      setError("Choose a PDF, DOCX, or TXT resume.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(nextFile);
    setError(null);
  }

  async function runAudit() {
    if (!file) return;
    setError(null);
    setProcessingMessage("Reading resume...");
    setState("processing");
    try {
      const evidence = await extractResume(file, ({ message }) => setProcessingMessage(message));
      setResult(evaluateResume(evidence));
      setState("result");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The resume could not be read.");
      setState("upload");
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setState("upload");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main>
      <nav className="topbar"><a href="#top" className="brand">Resume<span>Audit</span></a><span className="version">V1 · Source-locked rubric</span></nav>

      {state === "upload" && (
        <section className="upload-view" id="top">
          <div className="hero-copy">
            <span className="eyebrow">A 39-point resume review</span>
            <h1>Make every line<br /><em>earn its place.</em></h1>
            <p>Upload a resume for a strict, criterion-by-criterion audit against the approved 12-parameter rubric.</p>
            <div className="proof-row"><span>12 parameters</span><span>Exact rubric bands</span><span>Traceable evidence</span></div>
          </div>

          <div className="upload-panel">
            <div className="panel-number">01</div>
            <h2>Upload your resume</h2>
            <p>PDF, DOCX, or TXT. Your file is processed in this browser.</p>
            <label
              className={`drop-zone ${file ? "has-file" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                selectFile(event.dataTransfer.files[0] ?? null);
              }}
            >
              <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
              <span className="upload-icon">↗</span>
              {file ? <><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(0)} KB · Ready to audit</small></> : <><strong>Choose a resume</strong><small>or drop the file here</small></>}
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary-button" type="button" onClick={runAudit} disabled={!file}>Start strict audit <span>→</span></button>
            <p className="privacy-note">No account, saved history, or database is used.</p>
          </div>
        </section>
      )}

      {state === "processing" && (
        <section className="processing-view" aria-live="polite">
          <div className="spinner"><span /><span /><span /></div>
          <span className="eyebrow">Audit in progress</span>
          <h1>Reading the evidence.</h1>
          <p>{processingMessage}</p>
        </section>
      )}

      {state === "result" && result && (
        <section className="results-view">
          <header className="results-header">
            <div><span className="eyebrow">Audit report</span><h1 title={result.sourceFileName}>{readableFileName(result.sourceFileName)}</h1><p>Marked only against the approved Resume Audit parameters.</p></div>
            <div className="total-card"><span>Total</span><strong>{result.awardedTotal}<small>/39</small></strong></div>
            <button type="button" className="secondary-button" onClick={reset}>Audit another resume</button>
          </header>
          <ScoreStrip parameters={result.parameters} />
          <div className="report-heading"><span>Parameter comments</span><span>{result.parameters.length} parameters</span></div>
          <div className="parameter-grid">{result.parameters.map((parameter, index) => <ParameterCard parameter={parameter} index={index} key={parameter.parameter} />)}</div>
        </section>
      )}
    </main>
  );
}
