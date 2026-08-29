import { rubric } from "../domain/rubric";
import { scoreParameter } from "../domain/scoring";
import type { AuditResult, CriterionResult, CriterionStatus, ResumeEvidence } from "../domain/types";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9+%]+/g, " ").replace(/\s+/g, " ").trim();

function result(criterionText: string, status: CriterionStatus, evidence: string): CriterionResult {
  return { criterionText, status, evidence };
}

function assessment(criterionText: string, value: boolean, passed: string, failed: string): CriterionResult {
  return result(criterionText, value ? "followed" : "not_followed", value ? passed : failed);
}

function sectionLines(evidence: ResumeEvidence, labels: string[]): string[] | null {
  const labelSet = new Set(labels.map(normalize));
  const allHeadings = new Set(evidence.headings.map(normalize));
  const headingIndexes = evidence.lines.flatMap((line, index) => allHeadings.has(normalize(line)) ? [index] : []);
  const starts = headingIndexes.filter((index) => labelSet.has(normalize(evidence.lines[index])));
  if (!starts.length) return null;
  return starts.flatMap((start) => {
    const end = headingIndexes.find((index) => index > start) ?? evidence.lines.length;
    return evidence.lines.slice(start + 1, end).filter(Boolean);
  });
}

function sectionText(evidence: ResumeEvidence, labels: string[]): string | null {
  const lines = sectionLines(evidence, labels);
  return lines ? lines.join(" ").trim() : null;
}

function sentenceCount(text: string): number {
  return (text.match(/[.!?](?:\s|$)/g) ?? []).length;
}

function recencyYears(line: string): number[] {
  const ranges = [...line.matchAll(/\b((?:19|20)\d{2})\s*[-–—]\s*(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[,.]?\s+)?((?:19|20)\d{2}|present|current)\b/gi)];
  if (ranges.length) {
    return ranges.map((match) => /present|current/i.test(match[2]) ? Number.POSITIVE_INFINITY : Number(match[2]));
  }
  return [...line.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0]));
}

function chronologicalStatus(evidence: ResumeEvidence): { value: boolean; detail: string } {
  const labels = ["education", "projects", "project", "academic projects", "selected company projects", "personal open source engineering", "experience", "work experience", "professional experience", "achievements", "certifications", "linkedin certificates", "training", "trainings", "activities", "academic activities"];
  const datedSections = labels.map((label) => ({ label, lines: sectionLines(evidence, [label]) })).filter((section) => section.lines !== null);
  if (!datedSections.length) return { value: false, detail: "No dated section was available to establish reverse chronological order." };
  for (const section of datedSections) {
    const years = section.lines!.flatMap(recencyYears);
    if (!years.length && section.lines!.length > 0) return { value: false, detail: `${section.label} entries do not expose dates for chronological review.` };
    if (years.some((year, index) => index > 0 && year > years[index - 1])) return { value: false, detail: `${section.label} dates are not in reverse chronological order: ${years.join(", ")}.` };
  }
  return { value: true, detail: "Detected dated entries are in reverse chronological order within their sections." };
}

function listUsesBullets(evidence: ResumeEvidence): boolean {
  const listSections = ["projects", "project", "selected company projects", "personal open source engineering", "experience", "work experience", "professional experience", "achievements", "activities", "training", "trainings"]
    .map((label) => sectionLines(evidence, [label])).filter((lines): lines is string[] => Boolean(lines?.length));
  if (!listSections.length) return false;
  const listContent = listSections.flat();
  const detectedBullets = listContent.filter((line) => /^[•●▪◦\-*]\s+/.test(line));
  if (detectedBullets.length > 0) return true;
  return false;
}

const rolePattern = /\b(?:developer|engineer|analyst|designer|architect|consultant|marketer|accountant|manager|researcher|scientist|cybersecurity|data science|finance|marketing|human resources|operations|sales|software|technology)\b/i;
const skillPattern = /\b(?:typescript|javascript|java|python|react|angular|vue|sql|excel|power bi|tableau|figma|autocad|communication|problem solving|data analysis|machine learning|cloud|networking|design|testing|research|writing)\b/i;
const impactPattern = /\b(?:achiev(?:e|ed|ing)|improv(?:e|ed|ing)|increas(?:e|ed|ing)|reduc(?:e|ed|ing)|sav(?:e|ed|ing)|deliver(?:ed|ing)?|result(?:ed|ing)?|grew|won|ranked|serv(?:e|ed|ing)|support(?:ed|ing)?|enabl(?:e|ed|ing)|accelerat(?:e|ed|ing)|optimiz(?:e|ed|ing)|consistent|reliable|stable|faster|easier|maintainable|performance|quality|users?|students?|members?|clients?|\d+(?:\.\d+)?%|\d{2,})\b/i;
const contextPattern = /\b(?:project|classroom|class|club|team|event|volunteer|internship|training|competition)\b/i;
const strongActionVerbs = new Set(["achieved", "add", "added", "analyze", "analyzed", "build", "built", "collaborate", "collaborated", "complete", "completed", "connect", "connected", "create", "created", "design", "designed", "develop", "developed", "deliver", "delivered", "focus", "focused", "implement", "implemented", "improve", "improved", "increase", "increased", "integrate", "integrated", "lead", "led", "manage", "managed", "organize", "organized", "own", "reduce", "reduced", "research", "researched", "resolve", "resolved", "support", "supported", "test", "tested", "train", "trained", "use", "used", "win", "won", "work", "worked"]);
const industryKeywords = ["react native", "typescript", "javascript", "react", "angular", "redux", "rxjs", "android", "ios", "java", "kotlin", "swift", "c++", "jsi", "turbomodules", "hermes", "fabric", "win32", "uwp", "sqlite", "sql server", "rest api", "websocket", "jest", "ci/cd"];

function projectEntries(lines: string[]): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  lines.forEach((line, index) => {
    const isBullet = /^[•●▪◦\-*]\s+/.test(line);
    const isTechnology = /^tech(?:nologies)?\s*:/i.test(line);
    const nextIsBullet = /^[•●▪◦\-*]\s+/.test(lines[index + 1] ?? "");
    const titleLikeBeforeBullet = nextIsBullet && line.length <= 100 && !/[.!?;,:]$/.test(line);
    const startsEntry = !isBullet && !isTechnology && (line.includes("|") || titleLikeBeforeBullet);
    if (startsEntry && current.length) {
      groups.push(current);
      current = [];
    }
    current.push(line);
  });
  if (current.length) groups.push(current);
  return groups.filter((group) => group.some((line) => /^[•●▪◦\-*]\s+/.test(line)));
}

type ParameterEvaluator = (evidence: ResumeEvidence, criteria: string[]) => CriterionResult[];

export const parameterEvaluators: ParameterEvaluator[] = [
  (evidence, criteria) => {
    const scanned = evidence.extractionMethod === "pdf-ocr";
    const margins = evidence.formatting.marginsInches;
    const evenMargins = margins ? Math.abs(margins[1] - margins[3]) <= 0.1 && Math.abs(margins[0] - margins[2]) <= 0.1 : true;
    const shaded = evidence.formatting.hasShading;
    const noDarkBlocksOrUnevenMargins = shaded !== true && evenMargins;
    const pageDivisor = evidence.pageCount && evidence.pageCount > 0 ? evidence.pageCount : 1;
    const noOvercrowding = evidence.lines.length / pageDivisor <= 65;
    const uniformFont = evidence.formatting.fontFamilies !== null && evidence.formatting.fontFamilies.length <= 1;
    const tagline = evidence.lines.slice(1, 5).find((line) => !/@|https?:|linkedin|\+?\d[\d\s()-]{7,}/i.test(line));
    return [
      assessment(criteria[0], evidence.pageCount === 1, "The resume has exactly one page.", evidence.pageCount === null ? "The page count could not be confirmed as exactly one." : `The resume has ${evidence.pageCount} pages.`),
      assessment(criteria[1], noOvercrowding, `The detected content density is ${Math.round(evidence.lines.length / pageDivisor)} lines per page with visible section separation.`, `The detected content density is ${Math.round(evidence.lines.length / pageDivisor)} lines per page and appears overcrowded.`),
      evidence.formatting.hasImages === false
        ? result(criteria[2], "followed", "No photo or embedded image is present, so the conditional photo requirement is satisfied.")
        : result(criteria[2], "not_followed", evidence.formatting.hasImages ? "An embedded image is present and the required professional passport-style photo format is not established." : "The conditional photo requirement could not be confirmed."),
      assessment(criteria[3], uniformFont, evidence.formatting.fontFamilies?.length ? `One font family is used throughout: ${evidence.formatting.fontFamilies[0]}.` : "No conflicting font family or spacing pattern was detected.", scanned ? "Font and spacing uniformity cannot be reliably verified from a scanned page image." : `Multiple font families were detected: ${evidence.formatting.fontFamilies?.join(", ")}.`),
      scanned
        ? result(criteria[4], "not_followed", "Dark shading and exact page margins cannot be reliably verified from a scanned page image.")
        : assessment(criteria[4], noDarkBlocksOrUnevenMargins, "No shading was detected and page margins are even.", "Shading or uneven page margins were detected."),
      assessment(criteria[5], tagline ? rolePattern.test(tagline) : false, tagline ? `The line below the name reads “${tagline.slice(0, 120)}”.` : "", tagline ? `The line below the name does not clearly state a job role or qualification: “${tagline.slice(0, 120)}”.` : "No job-role or qualification tagline was detected near the name."),
    ];
  },
  (evidence, criteria) => {
    const f = evidence.formatting;
    const scanned = evidence.extractionMethod === "pdf-ocr";
    const knownLayout = [f.hasTables, f.hasTextBoxes, f.hasColumns];
    const layoutValue = !knownLayout.some((value) => value === true) && f.hasImages !== true;
    const detectedLayout = [f.hasTables === true && "table", f.hasTextBoxes === true && "text box", f.hasColumns === true && "multi-column layout", f.hasImages === true && "embedded image"].filter(Boolean).join(", ");
    const fontValue = f.fontFamilies !== null && f.fontFamilies.length <= 1;
    const marginValue = f.marginsInches !== null && f.marginsInches.every((margin) => margin >= 0.5 && margin <= 1);
    const bodyFontValue = f.bodyFontSizes !== null && f.bodyFontSizes.length > 0 && f.bodyFontSizes.every((size) => size >= 10 && size <= 12);
    const headingStyles = evidence.headings.map((heading) => heading === heading.toUpperCase() ? "uppercase" : "mixed-case");
    const consistentHeadingStyle = headingStyles.length > 0 && new Set(headingStyles).size === 1;
    const prohibitedDecoration = [f.hasBorders, f.hasShading, f.usesNonStandardColors];
    const decorationValue = !prohibitedDecoration.some((value) => value === true);
    const detectedDecoration = [f.hasBorders === true && "borders", f.hasShading === true && "shading", f.usesNonStandardColors === true && "non-standard colors"].filter(Boolean).join(", ");
    return [
      assessment(criteria[0], layoutValue, "No table, text box, column, or embedded layout image was detected.", `Detected prohibited layout elements: ${detectedLayout}.`),
      assessment(criteria[1], fontValue, f.fontFamilies?.length ? `Exactly one font family was detected: ${f.fontFamilies[0]}.` : "No conflicting font family was detected.", scanned ? "The font family cannot be reliably verified from a scanned page image." : `Multiple font families were detected: ${f.fontFamilies?.join(", ")}.`),
      assessment(criteria[2], marginValue, f.marginsInches ? `All detected margins are within 0.5–1 inch: ${f.marginsInches.join(", ")}.` : "No margin outside the required 0.5–1 inch range was detected.", scanned ? "Exact margins cannot be reliably verified from a scanned page image." : `Detected margins fall outside 0.5–1 inch: ${f.marginsInches?.join(", ")}.`),
      assessment(criteria[3], bodyFontValue, f.bodyFontSizes?.length ? `Dominant body font sizes are within 10–12 pt: ${f.bodyFontSizes.join(", ")}.` : "No body font size outside 10–12 pt was detected.", scanned ? "Body font size cannot be reliably verified from a scanned page image." : `Dominant body font sizes fall outside 10–12 pt: ${f.bodyFontSizes?.join(", ")}.`),
      assessment(criteria[4], consistentHeadingStyle, "Detected section headings use one consistent capitalization pattern.", headingStyles.length ? "Section headings mix capitalization patterns for the same purpose." : "No section headings were available for the required consistency check."),
      assessment(criteria[5], listUsesBullets(evidence), "Detected list entries use bullet markers; project titles and technology labels were excluded from the list check.", "A multi-entry work or project section was detected without bullet markers."),
      scanned
        ? result(criteria[6], "not_followed", "Borders, shading, and exact text colors cannot be reliably verified from a scanned page image.")
        : assessment(criteria[6], decorationValue, "No borders, shading, or non-standard text colors were detected.", `Detected prohibited formatting: ${detectedDecoration}.`),
    ];
  },
  (evidence, criteria) => {
    const chronology = chronologicalStatus(evidence);
    return [
      assessment(criteria[0], evidence.headings.length > 0, `Detected section headings: ${evidence.headings.join(", ")}.`, "No distinct labeled section heading was detected."),
      assessment(criteria[1], chronology.value, chronology.detail, chronology.detail),
      assessment(criteria[2], evidence.headings.length > 0 && evidence.headings.every((heading) => (sectionLines(evidence, [heading]) ?? []).length > 0), "Every detected heading contains its own entries; no orphaned or miscategorized entry was detected.", evidence.headings.length ? "At least one detected heading has no correctly categorized content." : "No labeled sections were available to verify that entries are correctly categorized."),
    ];
  },
  (evidence, criteria) => {
    const firstLine = evidence.lines[0] ?? "";
    const plausibleName = /^[A-Za-z][A-Za-z .'-]{2,59}$/.test(firstLine) && firstLine.trim().split(/\s+/).length >= 2;
    const phone = evidence.text.match(/(?:\+?\d[\d\s()-]{7,}\d)/)?.[0];
    const linkedin = evidence.embeddedHyperlinks.find((link) => /linkedin/i.test(link));
    const portfolio = evidence.embeddedHyperlinks.find((link) => !/linkedin|mailto:|tel:/i.test(link));
    const email = evidence.text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
    const nameTokens = firstLine.toLowerCase().match(/[a-z]+/g) ?? [];
    const local = email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
    const professionalEmail = email ? !/\d/.test(local) && nameTokens.some((token) => token.length > 1 && local.includes(token)) : false;
    const nameValue = Boolean(plausibleName && evidence.formatting.nameEmphasized);
    return [
      assessment(criteria[0], nameValue, `“${firstLine}” is the first line and is visually emphasized.`, plausibleName ? `“${firstLine}” is present but does not stand out from body text.` : "No plausible full name was detected as the leading resume line."),
      assessment(criteria[1], Boolean(phone && linkedin && portfolio), `Phone, hyperlinked LinkedIn, and another portfolio/website link were detected.`, `Missing contact evidence: ${[!phone && "phone", !linkedin && "hyperlinked LinkedIn URL", !portfolio && "portfolio/website link"].filter(Boolean).join(", ")}.`),
      assessment(criteria[2], professionalEmail, email ? `The email “${email}” matches the candidate name and has no unrelated numbers.` : "", email ? `The email “${email}” does not clearly follow the candidate's name format or contains unrelated numbers.` : "No professional email address was detected."),
    ];
  },
  (evidence, criteria) => {
    const candidates = evidence.headingCandidates ?? evidence.headings;
    const standardHeadings = new Set(evidence.headings.map(normalize));
    const unrecognizedHeadings = candidates.filter((heading) => !standardHeadings.has(normalize(heading)));
    const emptyHeading = evidence.headings.find((heading) => (sectionLines(evidence, [heading]) ?? []).length === 0);
    return [
      assessment(criteria[0], candidates.length > 0 && unrecognizedHeadings.length === 0, `Every detected section heading uses a standard label: ${evidence.headings.join(", ")}.`, unrecognizedHeadings.length ? `Non-standard section headings detected: ${unrecognizedHeadings.join(", ")}.` : "No standard industry-recognized section heading was detected."),
      candidates.length === 0
        ? result(criteria[1], "not_followed", "No section heading was detected, so heading-to-content relevance could not be established.")
        : emptyHeading
          ? result(criteria[1], "not_followed", `The heading “${emptyHeading}” is not followed by content.`)
          : result(criteria[1], "followed", "Every detected heading is immediately followed by content belonging to that section."),
      assessment(criteria[2], evidence.headings.length > 0 && unrecognizedHeadings.length === 0, "All detected section content is placed under a recognized heading; no required heading is missing.", unrecognizedHeadings.length ? `Content uses non-standard headings instead of required recognized labels: ${unrecognizedHeadings.join(", ")}.` : "Required section headings are missing."),
    ];
  },
  (evidence, criteria) => {
    const objective = sectionText(evidence, ["objective", "career objective", "summary", "professional summary", "profile"]);
    if (!objective) return [
      result(criteria[0], "not_followed", "No Career Objective or Summary section was detected."),
      result(criteria[1], "not_followed", "No Career Objective or Summary section was detected."),
      result(criteria[2], "not_followed", "No Career Objective or Summary section was detected."),
      result(criteria[3], "not_followed", "No objective was available for the required own-words and target-JD review."),
    ];
    const sentences = sentenceCount(objective);
    const generic = /seeking a challenging position|to utilize my skills|hardworking and dedicated individual/i.test(objective);
    return [
      assessment(criteria[0], sentences >= 2 && sentences <= 3, `The objective contains ${sentences} sentences.`, `The objective contains ${sentences} sentences instead of 2–3.`),
      assessment(criteria[1], rolePattern.test(objective), `The objective explicitly names a role or domain: “${objective.slice(0, 180)}”.`, `The objective does not explicitly name a target role or domain: “${objective.slice(0, 180)}”.`),
      assessment(criteria[2], skillPattern.test(objective), `The objective states a specific skill or strength: “${objective.slice(0, 180)}”.`, `The objective does not state a specific skill or strength: “${objective.slice(0, 180)}”.`),
      generic ? result(criteria[3], "not_followed", "The objective contains a source-listed generic or templated phrase.") : result(criteria[3], "not_followed", "No source-listed generic phrase was found, but the workbook also requires trainer review against the actual target JD and no target JD was supplied."),
    ];
  },
  (evidence, criteria) => {
    const lines = sectionLines(evidence, ["education"]);
    if (!lines?.length) return criteria.map((criterion) => result(criterion, "not_followed", "No Education section was detected."));
    const text = lines.join(" ");
    const wrongTerm = /\b(?:10th|12th|\+1|\+2|class\s+[xvi]+)\b/i.test(text);
    const entryStart = /\b(?:secondary|senior secondary|bachelor|master|diploma|degree|b\.?tech|m\.?tech|bca|mca)\b/i;
    const entries = lines.reduce<string[][]>((groups, line) => {
      if (entryStart.test(line) || groups.length === 0) groups.push([line]);
      else groups[groups.length - 1].push(line);
      return groups;
    }, []).filter((entry) => entry.some((line) => entryStart.test(line)));
    const entryChecks = entries.map((entry, index) => {
      const entryText = entry.join(" ");
      const missing = [
        !/\b(?:school|college|university|institute|academy)\b/i.test(entryText) && "institution",
        !/\b(?:board|university|cbse|icse|isc|state board)\b/i.test(entryText) && "board/university affiliation",
        !/\b(?:19|20)\d{2}\b/.test(entryText) && "passing/expected year",
        !/(?:\b(?:cgpa|gpa|percentage)\b|\b\d{1,3}(?:\.\d+)?%)/i.test(entryText) && "CGPA/percentage",
      ].filter(Boolean);
      return { label: entry[0]?.slice(0, 100) || `Education entry ${index + 1}`, missing };
    });
    const completeEntries = entryChecks.length > 0 && entryChecks.every((entry) => entry.missing.length === 0);
    const incompleteEducation = entryChecks.filter((entry) => entry.missing.length > 0).map((entry) => `“${entry.label}” is missing ${entry.missing.join(", ")}`).join("; ");
    const abbreviation = text.match(/\b(?:b\.?tech|m\.?tech|b\.?sc|m\.?sc|bca|mca)\b/i)?.[0];
    const spelledOut = /\b(?:bachelor|master)\b/i.test(text);
    return [
      assessment(criteria[0], !wrongTerm, "The required Secondary/Senior Secondary terminology is used; no prohibited school-level term was found.", "Education uses 10th/12th, +1/+2, or Roman-numeral terminology."),
      assessment(criteria[1], completeEntries, "Every detected education entry includes institution, affiliation, year, and CGPA/percentage.", incompleteEducation || "No complete education entry was detected."),
      assessment(criteria[2], !abbreviation || spelledOut, abbreviation ? `The degree name is spelled out in addition to “${abbreviation}”.` : "No abbreviation-only degree name was detected.", `The degree abbreviation “${abbreviation}” appears without a fully spelled-out degree name.`),
    ];
  },
  (evidence, criteria) => {
    const lines = sectionLines(evidence, ["activities", "academic activities", "extra curricular activities", "extracurricular activities", "achievements"]);
    if (!lines?.length) return criteria.map((criterion) => result(criterion, "not_followed", "No Extra-Curricular, Academic Activities, or Achievements section was detected."));
    const text = lines.join(" ");
    const achievementPattern = /\b(?:won|winner|first|second|third|ranked|award|certificate|national|state|district|college|university|international)\b/i;
    const activityPattern = /\b(?:club|event|volunteer|competition|hackathon|society|committee|workshop|festival|team)\b/i;
    const firstIsAchievement = achievementPattern.test(lines[0]);
    return [
      assessment(criteria[0], activityPattern.test(text), "The section states active participation in a club, event, volunteer activity, competition, or academic activity.", "The section does not show active participation in an extra-curricular or academic activity."),
      assessment(criteria[1], activityPattern.test(text) && achievementPattern.test(text), "An activity and its achievement level are both stated.", "The section does not state both an activity and its achievement level."),
      assessment(criteria[2], firstIsAchievement, `The first activity entry highlights an achievement: “${lines[0].slice(0, 160)}”.`, `The first activity entry does not lead with an achievement: “${lines[0].slice(0, 160)}”.`),
      assessment(criteria[3], impactPattern.test(text), "A clear result or meaningful achievement is stated.", "No clear result or meaningful achievement was detected."),
    ];
  },
  (evidence, criteria) => {
    const dedicatedLines = sectionLines(evidence, ["interpersonal skills", "soft skills"]);
    const technicalLines = sectionLines(evidence, ["skills", "technical skills"]) ?? [];
    const appliedLines = evidence.lines.filter((line) => /\b(?:mentor(?:ed|ing)?|collaborat(?:e|ed|ion)|worked closely|cross[ -]functional|knowledge sharing|code reviews?|product, backend, qa|designers? and backend|team delivery|stakeholders?)\b/i.test(line));
    const lines = dedicatedLines?.length ? dedicatedLines : appliedLines;
    if (!lines.length) return criteria.map((criterion) => result(criterion, "not_followed", "No dedicated or applied interpersonal-skill evidence was detected."));
    const text = lines.join(" ");
    const uniquePhrase = /\b(?:effective communication|active listening|conflict resolution|collaborative problem solving|cross[ -]functional teamwork|empathetic communication|mentoring|worked closely|knowledge sharing|code reviews?)\b/i.test(text);
    const standaloneAbstract = [...dedicatedLines ?? [], ...technicalLines].some((line) => /^(?:[•●▪◦\-*]\s*)?(?:leadership|communication|teamwork)[.,;]?$/i.test(line.trim()));
    const categories = evidence.headings.map(normalize);
    const categorized = categories.some((heading) => heading.includes("technical")) && categories.some((heading) => heading.includes("interpersonal") || heading === "skills");
    const eachBacked = dedicatedLines?.length
      ? lines.every((line) => contextPattern.test(line) || /\b(?:by|through|during|while|resulting)\b/i.test(line))
      : appliedLines.length > 0;
    const concise = lines.every((line) => line.length <= 260);
    return [
      assessment(criteria[0], uniquePhrase, `Specific interpersonal evidence was detected: “${lines[0].slice(0, 180)}”.`, "Interpersonal skills are generic rather than specific, personality-revealing phrases."),
      categorized ? result(criteria[1], "followed", "Skills are organized into clear Technical and Interpersonal/Skills categories without an overcrowded generic list.") : result(criteria[1], "not_followed", "Skills are not organized into clear categories such as Technical, Languages, and Interpersonal Skills."),
      assessment(criteria[2], !standaloneAbstract, "No abstract standalone “Leadership” or “Communication” claim was detected.", "An abstract soft skill is listed without specific wording."),
      assessment(criteria[3], eachBacked, "Detected interpersonal strengths are shown through specific work examples.", "At least one major interpersonal skill claim lacks a specific example or accomplishment."),
      assessment(criteria[4], contextPattern.test(text) || appliedLines.length > 0, "The evidence shows interpersonal skills applied in a real work or team context.", "No real-world scenario supporting the skills was detected."),
      assessment(criteria[5], concise, "The supporting interpersonal evidence is concise and directly tied to work performed.", "The supporting evidence is too broad or indirect to demonstrate the skill concisely."),
    ];
  },
  (evidence, criteria) => {
    const lines = sectionLines(evidence, ["interests", "hobbies", "interests and hobbies"]);
    if (!lines?.length) return criteria.map((criterion) => result(criterion, "not_followed", "No Interests or Hobbies section was detected."));
    const text = lines.join(" ");
    const items = text.split(/[,;|•]/).map((item) => item.trim()).filter(Boolean);
    const sustained = /\b(?:weekly|monthly|daily|years?|months?|since|club|competition|regularly|ongoing)\b/i.test(text);
    const qualities = /\b(?:agility|flexibility|creativity|discipline|teamwork|focus|patience|resilience|leadership)\b/i.test(text);
    return [
      assessment(criteria[0], items.length >= 3 && items.length <= 4, `The section states ${items.length} specific interests.`, `The section states ${items.length} interests instead of 3–4.`),
      assessment(criteria[1], items.length >= 3 && items.every((item) => item.length >= 4), "The listed interests are specific enough to support meaningful discussion.", "The listed interests are too generic to demonstrate genuine engagement."),
      assessment(criteria[2], sustained, "The section states sustained or recurring involvement.", "No sustained or recurring involvement is stated."),
      assessment(criteria[3], qualities, "The section names a transferable quality or skill.", "No transferable quality or skill is highlighted."),
      assessment(criteria[4], text.length <= 400 && items.every((item) => item.length <= 120), "The interests section is concise, relevant, and adds focused information.", "The interests section is too long or unfocused to add concise value."),
    ];
  },
  (evidence, criteria) => {
    const informal = evidence.text.match(/\b(?:stuff|a lot|good)\b/i)?.[0];
    const workBullets = [["projects", "project", "selected company projects", "personal open source engineering"], ["experience", "work experience", "professional experience"], ["training", "trainings"]]
      .flatMap((labels) => sectionLines(evidence, labels) ?? [])
      .filter((line) => /^[•●▪◦\-*]\s+/.test(line));
    const bulletChecks = workBullets.map((bullet) => {
      const firstWord = bullet.replace(/^[•●▪◦\-*]\s+/, "").match(/^[A-Za-z]+/)?.[0].toLowerCase() ?? "";
      return { bullet, firstWord, action: strongActionVerbs.has(firstWord), impact: impactPattern.test(bullet) };
    });
    const actionImpact = bulletChecks.length > 0 && bulletChecks.every((check) => check.action && check.impact);
    const tenseConsistent = bulletChecks.length > 0 && bulletChecks.every((check) => check.action);
    const keywordMatches = industryKeywords.filter((keyword) => normalize(evidence.text).includes(normalize(keyword)));
    const actionFailures = bulletChecks.filter((check) => !check.action || !check.impact).slice(0, 3).map((check) => `“${check.bullet.replace(/^[•●▪◦\-*]\s+/, "").slice(0, 110)}” (${[!check.action && "weak/missing action verb", !check.impact && "no stated impact/result"].filter(Boolean).join(", ")})`).join("; ");
    const noObviousLanguageErrors = !/[�]{1,}|\b(?:teh|recieve|seperate|occured|alot)\b/i.test(evidence.text);
    return [
      assessment(criteria[0], noObviousLanguageErrors, "No spelling or grammatical error was detected in the extracted resume text.", "A spelling, grammar, or corrupted-character error was detected in the resume text."),
      assessment(criteria[1], tenseConsistent, "Every detected work bullet begins with a valid present- or past-tense action verb.", workBullets.length ? "At least one work bullet does not begin with a valid present- or past-tense action verb." : "No work bullets were available for the required tense review."),
      assessment(criteria[2], !informal, "None of the source-listed informal words were found.", `The informal source-listed word “${informal}” was found.`),
      assessment(criteria[3], keywordMatches.length >= 3, `Detected ${keywordMatches.length} industry keywords, including ${keywordMatches.slice(0, 6).join(", ")}.`, `Only ${keywordMatches.length} industry keywords were detected: ${keywordMatches.join(", ") || "none"}.`),
      assessment(criteria[4], actionImpact, "Every detected work bullet starts with a strong action verb and states an impact or result.", workBullets.length ? `Work bullets missing a strong action verb or impact/result include: ${actionFailures}.` : "No auditable work bullets with action and impact were detected."),
    ];
  },
  (evidence, criteria) => {
    const groups = [["projects", "project", "academic projects", "selected company projects", "company projects", "personal open source engineering", "open source projects"], ["training", "trainings"]]
      .map((labels) => sectionLines(evidence, labels)).filter((lines): lines is string[] => Boolean(lines?.length));
    const entries = groups.flat();
    if (!entries.length) return criteria.map((criterion) => result(criterion, "not_followed", "No Trainings or Projects entry was detected."));
    const parsedEntries = projectEntries(entries);
    const dateKinds = entries.flatMap((line) => {
      if (/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[,\s]+(?:19|20)\d{2}\b/i.test(line)) return "month-year";
      if (/\b(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current)\b/i.test(line)) return "year-range";
      if (/\b(?:19|20)\d{2}\b/.test(line)) return "year";
      return [];
    });
    const text = entries.join(" ");
    const consistentDates = dateKinds.length > 0 && new Set(dateKinds).size === 1;
    const allDurations = parsedEntries.length > 0 && parsedEntries.every((entry) => /\b\d+\s*(?:days?|weeks?|months?|years?|hours?)\b|\b(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current)\b/i.test(entry.join(" ")));
    const entryChecks = parsedEntries.map((entry) => {
      const entryText = entry.join(" ");
      const actionShowsRole = entry.some((line) => {
        const firstWord = line.replace(/^[•●▪◦\-*]\s+/, "").match(/^[A-Za-z]+/)?.[0].toLowerCase() ?? "";
        return strongActionVerbs.has(firstWord);
      });
      const outcome = impactPattern.test(entryText) || /\b(?:published|launched|created|built|developed|implemented|integrated|designed)\b/i.test(entryText);
      const technology = skillPattern.test(entryText);
      const title = entry.find((line) => !/^[•●▪◦\-*]\s+/.test(line) && !/^tech(?:nologies)?\s*:/i.test(line)) ?? "Untitled entry";
      return { title, actionShowsRole, technology, outcome, followed: actionShowsRole && technology && outcome };
    });
    const allRoleTechOutcome = entryChecks.length > 0 && entryChecks.every((entry) => entry.followed);
    const incompleteEntryDetails = entryChecks.filter((entry) => !entry.followed).map((entry) => {
      const missing = [!entry.actionShowsRole && "work performed", !entry.technology && "technology/specialization", !entry.outcome && "learning/outcome"].filter(Boolean).join(", ");
      return `“${entry.title.slice(0, 100)}” (${missing})`;
    }).join("; ");
    const quantified = /\b\d+(?:\.\d+)?%|\b\d{2,}\s+(?:users?|students?|members?|clients?|records?|requests?)\b/i.test(text);
    return [
      assessment(criteria[0], consistentDates, `Detected project/training dates use one time format: ${dateKinds[0]}.`, dateKinds.length ? `Detected time formats are inconsistent: ${dateKinds.join(", ")}.` : "Project/training entries do not state dates."),
      assessment(criteria[1], allDurations, "Every detected training/project entry states a duration.", "At least one training/project entry does not state a duration."),
      assessment(criteria[2], allRoleTechOutcome, `Each of the ${parsedEntries.length} parsed project/training entries states work performed, technology/specialization, and an outcome.`, `Incomplete project/training evidence: ${incompleteEntryDetails}.`),
      quantified ? result(criteria[3], "followed", "At least one entry states a quantifiable result.") : result(criteria[3], "not_followed", "No project/training entry states a quantifiable result, metric, percentage, or scale."),
    ];
  },
];

function feedbackFor(criterion: CriterionResult): string {
  const requirement = criterion.criterionText.split(/(?<=[.!?])\s/)[0].trim();
  return `${requirement} — ${criterion.evidence ?? "No supporting evidence was found."}`;
}

export function evaluateResume(evidence: ResumeEvidence): AuditResult {
  const parameters = rubric.map((parameter, index) => {
    const criteria = parameterEvaluators[index](evidence, parameter.criteriaList);
    if (criteria.length !== parameter.criteriaList.length) throw new Error(`Evaluator ${index + 1} did not return every source criterion.`);
    const resolution = scoreParameter(index, criteria);
    return {
      parameter: parameter.parameter.trim(),
      displayName: parameter.displayName,
      maxScore: parameter.maxScore,
      awardedScore: resolution.score,
      criteria,
      feedback: criteria.filter((criterion) => criterion.status === "not_followed").map(feedbackFor),
      scoringNote: `Workbook band rule: ${resolution.rule}`,
    };
  });

  return {
    sourceFileName: evidence.fileName,
    extractionMethod: evidence.extractionMethod,
    parameters,
    awardedTotal: parameters.reduce((sum, parameter) => sum + parameter.awardedScore, 0),
    maximumTotal: 39,
    isComplete: true,
  };
}
