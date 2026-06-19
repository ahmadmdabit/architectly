// fallback.ts — Offline template used when AI generation fails.
import type { DocSummary, DocType, HistoryEntry } from "../../types.ts";

const lo = (v: string | string[]): string => (Array.isArray(v) ? v.map((x) => `- ${x}`).join("\n") : v || "Not specified.");

export function generateFallbackDocument(summary: DocSummary, history: readonly HistoryEntry[], docType: DocType): string {
  const isBRD = docType === "BRD";
  const date = new Date().toLocaleString();
  let doc = `# ${summary.title} — ${docType}\n\n`;
  doc += `*Generated locally (offline mode) on ${date}.*\n\n`;
  doc += `## 1. Executive Summary\n\n${lo(summary.vision)}\n\n`;
  doc += `## 2. Problem Statement\n\n${lo(summary.problemStatement)}\n\n`;
  if (isBRD) {
    doc += `## 3. Target Audience\n\n${lo(summary.targetAudience)}\n\n`;
    doc += `## 4. Business Objectives\n\n${lo(summary.businessObjectives)}\n\n`;
    doc += `## 5. Key Features\n\n${lo(summary.keyFeatures)}\n\n`;
  } else {
    doc += `## 3. Users & Personas\n\n${lo(summary.userPersonas)}\n\n`;
    doc += `## 4. User Stories\n\n${lo(summary.userStories)}\n\n`;
    doc += `## 5. Functional Requirements\n\n${lo(summary.functionalRequirements)}\n\n`;
    doc += `## 6. Non-Functional Requirements\n\n${lo(summary.nonFunctionalRequirements)}\n\n`;
    doc += `## 7. Design & UX Guidelines\n\n${lo(summary.designGuidelines)}\n\n`;
    doc += `## 8. Technical Constraints\n\n${lo(summary.technicalConstraints)}\n\n`;
    doc += `## 9. Release Criteria\n\n${lo(summary.releaseCriteria)}\n\n`;
  }
  doc += `## 10. Stakeholders\n\n${lo(summary.stakeholders)}\n\n`;
  doc += `## 11. Constraints & Risks\n\n${lo(summary.constraints)}\n\n`;
  doc += `## 12. Success Metrics\n\n${lo(summary.successMetrics)}\n\n`;
  doc += `## 13. Timeline\n\n${lo(summary.timeline)}\n\n`;
  if (summary.additionalContext) doc += `## 14. Additional Context\n\n${lo(summary.additionalContext)}\n\n`;
  const assumed = history.filter((h) => h.assumed);
  if (assumed.length > 0) {
    doc += `## 15. AI-Generated Assumptions (to validate)\n\n`;
    for (const a of assumed) {
      const ans = Array.isArray(a.answer) ? a.answer.join("; ") : a.answer;
      doc += `- **ASSUMPTION [${a.id}]:** ${ans} — *Source: AI-assumed based on related answers.*\n`;
    }
    doc += "\n";
  }
  return doc;
}
