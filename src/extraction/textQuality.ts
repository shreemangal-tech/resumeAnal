export function hasUsableResumeText(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length < 80) return false;
  return normalized.split(/\s+/).filter(Boolean).length >= 15;
}

export function cleanOcrText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

const embeddedHeadingPattern = /\b(?:PROFESSIONAL\s+SUMMARY|CAREER\s+OBJECTIVE|WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|ACADEMIC\s+PROJECTS|TECHNICAL\s+SKILLS|SOFT\s+SKILLS|INTERPERSONAL\s+SKILLS|LINKEDIN\s+CERTIFICATES|ACADEMIC\s+ACTIVITIES|EXTRA\s+CURRICULAR\s+ACTIVITIES|PROFILE|OBJECTIVE|SUMMARY|CONTACT|EDUCATION|EXPERIENCE|PROJECTS?|SKILLS|CERTIFICATIONS|ACHIEVEMENTS|TRAININGS?|INTERESTS|HOBBIES|LANGUAGES)\b/g;

export function separateEmbeddedOcrHeadings(text: string): string {
  return text.split("\n").flatMap((line) => {
    const matches = [...line.matchAll(embeddedHeadingPattern)];
    if (!matches.length) return [line];
    const parts: string[] = [];
    let cursor = 0;
    for (const match of matches) {
      const index = match.index ?? 0;
      const before = line.slice(cursor, index).trim();
      if (before) parts.push(before);
      parts.push(match[0].replace(/\s+/g, " "));
      cursor = index + match[0].length;
    }
    const after = line.slice(cursor).trim();
    if (after) parts.push(after);
    return parts;
  }).filter(Boolean).join("\n");
}
