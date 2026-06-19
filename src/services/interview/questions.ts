// questions.ts — Question banks. Reused from the original codebase (semantics preserved),
// re-typed and with i18n keys attached. The `text`, `helper`, `placeholder` strings here are
// English defaults; the i18n layer can replace them at render time via the question id.
import type { Question } from "../../types.ts";

export const SharedQuestions: readonly Question[] = [
  {
    id: "vision",
    category: "Core",
    priority: "high",
    type: "long",
    text: "Describe your project in a few sentences.",
    helper: "What is this project about? What makes it unique?",
    placeholder:
      "A next-generation e-commerce platform focused on sustainable products with AI-powered recommendations…",
    followUp: (_answer, all) => {
      const title = typeof all.title === "string" ? all.title : "";
      if (title.trim().length > 0) return [];
      return [{ id: "@deriveTitle", dynamic: true, category: "Core", priority: "high", type: "text", text: "" }];
    },
  },
  {
    id: "problemStatement",
    category: "Core",
    priority: "high",
    type: "long",
    text: "What problem does this project solve?",
    helper: "Describe the current pain points and why this project matters.",
    placeholder: "Our current checkout process has a 68% abandonment rate due to complexity…",
  },
  {
    id: "successMetrics",
    category: "Goals",
    priority: "high",
    type: "long",
    text: "How will you measure success?",
    helper: "Define KPIs and success criteria for this project.",
    placeholder: "Conversion rate > 5%, average order value up 15%, CSAT > 4.5/5…",
  },
  {
    id: "stakeholders",
    category: "Stakeholders",
    priority: "high",
    type: "long",
    text: "Who are the key stakeholders?",
    helper: "List the main stakeholders and their interests.",
    placeholder: "CEO — strategic alignment · VP Marketing — acquisition · CTO — feasibility…",
  },
  {
    id: "constraints",
    category: "Constraints",
    priority: "medium",
    type: "long",
    text: "What constraints or risks should we consider?",
    helper: "Budget, timeline, technical limits, regulatory, known risks.",
    placeholder: "Must comply with GDPR · Budget capped at $500K · Legacy integration required…",
  },
  {
    id: "timeline",
    category: "Plan",
    priority: "medium",
    type: "text",
    text: "What is the expected timeline?",
    helper: "Target launch date or key milestones.",
    placeholder: "MVP in 3 months, full launch in 6 months",
  },
  {
    id: "additionalContext",
    category: "Wrap-up",
    priority: "low",
    type: "long",
    text: "Any additional context or information?",
    helper: "Competitive landscape, strategic importance, dependencies, or anything else.",
    placeholder: "Our main competitor just launched a similar feature — speed to market is critical…",
  },
];

export const PrdQuestions: readonly Question[] = [
  {
    id: "userPersonas",
    category: "Users",
    priority: "high",
    type: "long",
    text: "Describe your primary user personas.",
    helper: "Who are your target users? Include demographics, behaviors, and goals.",
    placeholder: "Persona 1: 'Busy Professional' — aged 30–50, tech-savvy, values efficiency…",
  },
  {
    id: "userStories",
    category: "Requirements",
    priority: "high",
    type: "multi-text",
    text: "What are the key user stories?",
    helper: "List the main user stories. Format: 'As a [user], I want [feature] so that [benefit].'",
    placeholder: "As a shopper, I want to filter by sustainability rating so that I can make eco-friendly choices",
  },
  {
    id: "functionalRequirements",
    category: "Requirements",
    priority: "high",
    type: "long",
    text: "What are the core functional requirements?",
    helper: "Describe the essential features and functionality in detail.",
    placeholder:
      "Users must be able to create an account with SSO, browse products by category, checkout within 3 clicks…",
  },
  {
    id: "nonFunctionalRequirements",
    category: "Requirements",
    priority: "medium",
    type: "long",
    text: "What non-functional requirements apply?",
    helper: "Performance, security, scalability, accessibility, platform requirements.",
    placeholder: "Page load < 2s · 99.9% uptime · WCAG 2.1 AA · 10K concurrent users…",
  },
  {
    id: "designGuidelines",
    category: "Design",
    priority: "medium",
    type: "long",
    text: "Are there design or UX guidelines to follow?",
    helper: "Design system, branding, platform conventions, or specific UX requirements.",
    placeholder: "Follow Material Design 3 · use existing brand color palette · support dark mode…",
  },
  {
    id: "technicalConstraints",
    category: "Constraints",
    priority: "medium",
    type: "long",
    text: "What technical constraints or dependencies exist?",
    helper: "Tech stack requirements, integration points, APIs, platform limits.",
    placeholder: "Must integrate with Salesforce CRM · React frontend · AWS infrastructure…",
  },
  {
    id: "releaseCriteria",
    category: "Plan",
    priority: "medium",
    type: "long",
    text: "What are the release criteria and rollout plan?",
    helper: "Definition of done, phased rollout, beta testing, or gradual feature release.",
    placeholder: "Phase 1: Internal beta with 100 users · Phase 2: Public beta · Phase 3: GA…",
  },
];

export const BrdQuestions: readonly Question[] = [
  {
    id: "businessObjectives",
    category: "Goals",
    priority: "high",
    type: "multi-text",
    text: "What are the key business objectives?",
    helper: "List 2–5 measurable business goals this project aims to achieve.",
    placeholder: "Increase conversion rate by 25%",
  },
  {
    id: "targetAudience",
    category: "Users",
    priority: "high",
    type: "long",
    text: "Who are the target users / customers?",
    helper: "Describe the primary and secondary user groups.",
    placeholder: "Primary: Small business owners aged 25–45 · Secondary: Enterprise procurement managers…",
  },
  {
    id: "keyFeatures",
    category: "Requirements",
    priority: "high",
    type: "multi-text",
    text: "What are the key features or requirements?",
    helper: "List the essential features this solution must include.",
    placeholder: "One-click checkout with saved payment methods",
  },
  {
    id: "budget",
    category: "Constraints",
    priority: "low",
    type: "text",
    text: "What is the estimated budget range?",
    helper: "Optional. Helps align scope with resources.",
    placeholder: "$200K – $500K",
  },
];

export function getQuestionsForType(type: "PRD" | "BRD"): readonly Question[] {
  return type === "PRD" ? [...SharedQuestions, ...PrdQuestions] : [...SharedQuestions, ...BrdQuestions];
}
