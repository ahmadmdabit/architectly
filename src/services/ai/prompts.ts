// prompts.ts — All AI prompt builders, locale-aware.
import type { DocSummary, DocType, HistoryEntry, Locale, Question } from "../../types.ts";

const LANG_NAME: Record<Locale, string> = { en: "English", tr: "Turkish", ar: "Arabic" };

const langClause = (locale: Locale): string =>
  `Respond ONLY in ${LANG_NAME[locale]}. All headings, prose, lists and tables must be in ${LANG_NAME[locale]}.`;

export function buildDeriveTitlePrompt(vision: string, locale: Locale): string {
  return `You are a senior product manager naming a new product.

User's description (vision):
"""${vision}"""

Produce a short, memorable, product-style name (2–4 words, Title Case). No quotes, no explanation, no preamble. Just the name. Avoid generic words like "Platform", "App", "System" unless necessary.
${langClause(locale)}`;
}

export function buildAssumePrompt(
  question: Question,
  history: readonly HistoryEntry[],
  docType: DocType,
  locale: Locale,
): string {
  const context = history
    .filter((h) => h.answer && !h.skipped)
    .map((h) => `Q: ${h.text}\nA: ${Array.isArray(h.answer) ? h.answer.join("; ") : h.answer}`)
    .join("\n\n");
  return `You are a senior product manager acting for a user who skipped a question in a ${docType} interview.

Their answers so far:
"""
${context || "(no answers yet)"}
"""

They skipped: "${question.text}"
${question.helper ? `Context: ${question.helper}` : ""}

Produce a concise, sensible, professional assumption (2–4 sentences) the AI can use. Be specific, industry-conventional, aligned with prior answers. Return ONLY the assumption text — no preamble, no quotes.
${langClause(locale)}`;
}

const PRD_STRUCTURE = `Structure (use EXACTLY these H2 headings in this order):
# <Title> — Product Requirements Document
## 1. Executive Summary
## 2. Problem Statement & Opportunity
## 3. Users & Personas
## 4. User Stories
## 5. Functional Requirements
## 6. Non-Functional Requirements
## 7. Design & UX Guidelines
## 8. Technical Constraints & Dependencies
## 9. Release Criteria & Rollout Plan
## 10. Success Metrics & KPIs
## 11. Risks, Assumptions & Open Questions
## 12. Milestones & Timeline`;

const BRD_STRUCTURE = `Structure (use EXACTLY these H2 headings in this order):
# <Title> — Business Requirements Document
## 1. Executive Summary
## 2. Business Objectives & Success Criteria
## 3. Target Audience
## 4. Scope & Features
## 5. Stakeholders
## 6. Constraints, Assumptions & Risks
## 7. Timeline & Milestones
## 8. Success Metrics & KPIs
## 9. Acceptance & Sign-off Criteria`;

const listOrText = (v: string | string[]): string =>
  Array.isArray(v) ? v.map((x) => `- ${x}`).join("\n") : v;

export function buildGenerationPrompt(
  docType: DocType,
  summary: DocSummary,
  history: readonly HistoryEntry[],
  locale: Locale,
): string {
  const isBRD = docType === "BRD";
  const structure = isBRD ? BRD_STRUCTURE : PRD_STRUCTURE;

  const assumed = history
    .filter((h) => h.assumed)
    .map((h) => `  - [${h.id}] ${h.text}: "${Array.isArray(h.answer) ? h.answer.join("; ") : h.answer}"`);
  const skipped = history
    .filter((h) => h.skipped && !h.assumed)
    .map((h) => `  - [${h.id}] ${h.text}`);
  const assumptionsBlock =
    assumed.length || skipped.length
      ? `\n\nTRANSPARENCY — AI ASSUMPTIONS REGISTER:
Surface these in the document's Risks/Assumptions section as "AI-Generated Assumptions (to validate)":
${assumed.length ? "Assumed by AI:\n" + assumed.join("\n") : ""}
${skipped.length ? "Skipped:\n" + skipped.join("\n") : ""}`
      : "";

  return `You are a senior product manager and business analyst. Produce a polished, production-quality ${docType} based STRICTLY on the interview answers. Do not invent facts. If something is missing, write "Not specified" and add it to Open Questions.

QUALITY BAR:
- Crisp, specific, executive-ready prose. No filler, no hype.
- Bullet points and short paragraphs. Tables where they aid clarity.
- Unique IDs for each requirement (BR-001, US-001, NFR-001).
- User stories: "As a [persona], I want to [action], so that [outcome]." with acceptance criteria.
- Risks: include likelihood (L/M/H), impact (L/M/H), mitigation.
- For PRD, "User Stories" should be a table or numbered list with the As/I want/So that + acceptance criteria.
- For BRD, "Business Requirements" should be numbered BR-001.. with priority tags.
- Do NOT embed raw HTML, <script>, <style>, <iframe>, or executable code. Output Markdown only.

${structure}

INTERVIEW ANSWERS:
- Title: ${summary.title}
- Vision / Overview: ${typeof summary.vision === "string" ? summary.vision : listOrText(summary.vision)}
- Problem statement: ${typeof summary.problemStatement === "string" ? summary.problemStatement : listOrText(summary.problemStatement)}
- Success metrics: ${typeof summary.successMetrics === "string" ? summary.successMetrics : listOrText(summary.successMetrics)}
- Stakeholders: ${typeof summary.stakeholders === "string" ? summary.stakeholders : listOrText(summary.stakeholders)}
- Constraints/risks: ${typeof summary.constraints === "string" ? summary.constraints : listOrText(summary.constraints)}
- Timeline: ${typeof summary.timeline === "string" ? summary.timeline : listOrText(summary.timeline)}
- Additional context: ${typeof summary.additionalContext === "string" ? summary.additionalContext : listOrText(summary.additionalContext)}
${
  isBRD
    ? `
- Business objectives:
${listOrText(summary.businessObjectives)}
- Target audience: ${typeof summary.targetAudience === "string" ? summary.targetAudience : listOrText(summary.targetAudience)}
- Key features:
${listOrText(summary.keyFeatures)}
- Budget: ${typeof summary.budget === "string" ? summary.budget : listOrText(summary.budget)}`
    : `
- User personas: ${typeof summary.userPersonas === "string" ? summary.userPersonas : listOrText(summary.userPersonas)}
- User stories:
${listOrText(summary.userStories)}
- Functional requirements: ${typeof summary.functionalRequirements === "string" ? summary.functionalRequirements : listOrText(summary.functionalRequirements)}
- Non-functional requirements: ${typeof summary.nonFunctionalRequirements === "string" ? summary.nonFunctionalRequirements : listOrText(summary.nonFunctionalRequirements)}
- Design guidelines: ${typeof summary.designGuidelines === "string" ? summary.designGuidelines : listOrText(summary.designGuidelines)}
- Technical constraints: ${typeof summary.technicalConstraints === "string" ? summary.technicalConstraints : listOrText(summary.technicalConstraints)}
- Release criteria: ${typeof summary.releaseCriteria === "string" ? summary.releaseCriteria : listOrText(summary.releaseCriteria)}`
}
${assumptionsBlock}

OUTPUT: Markdown only, no preamble, no closing remarks. ${langClause(locale)} Begin now.`;
}

export function buildRefinePrompt(
  docType: DocType,
  heading: string,
  originalContent: string,
  instruction: string,
  locale: Locale,
): string {
  return `You are a senior product manager refining one section of a ${docType}.

User instruction: """${instruction || "Improve clarity and specificity."}"""

RULES:
- Output ONLY the replacement section starting with "## ${heading}".
- Preserve IDs (BR-xxx, US-xxx, NFR-xxx) if stable.
- No meta-commentary.
- ${langClause(locale)}

ORIGINAL SECTION:
${originalContent}

REPLACEMENT:`;
}
