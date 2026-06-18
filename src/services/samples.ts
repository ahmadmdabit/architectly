// samples.ts — Local PRD/BRD sample fixtures (offline). Refined for clarity.
import type { AnswerMap, DocType } from "../types.ts";

export const SAMPLES: Record<DocType, AnswerMap & { title: string }> = {
  PRD: {
    title: "Sustainable Shop",
    vision:
      "A next-generation e-commerce platform focused on sustainable products with AI-powered recommendations that match shoppers with brands aligned to their values.",
    problemStatement:
      "Existing sustainable-commerce sites overwhelm shoppers with thousands of products and inconsistent sustainability metrics, making informed purchases tedious.",
    successMetrics:
      "Conversion rate > 5% · average order value up 15% · CSAT > 4.5/5 · repeat-purchase rate up 20% within 6 months.",
    stakeholders:
      "CEO — strategic alignment · VP Marketing — acquisition · CTO — feasibility · Director of Sustainability — content standards.",
    constraints:
      "Must comply with GDPR and the EU Green Claims Directive · Budget capped at $500K · Must integrate with existing Salesforce CRM.",
    timeline: "MVP in 3 months, full launch in 6 months.",
    additionalContext:
      "Two main competitors launched similar features last quarter; speed to market is critical.",
    userPersonas:
      "Persona 1: 'Eco-conscious Millennial' — 25–35, urban, willing to pay 10% premium for verified sustainable goods. Persona 2: 'Gift Buyer' — needs curated bundles and fast shipping.",
    userStories: [
      "As a shopper, I want to filter by sustainability rating so that I can make eco-friendly choices.",
      "As a returning user, I want to see recommendations based on my values so that I can discover new brands I'll trust.",
      "As a gift buyer, I want curated bundles so that I can send thoughtful gifts quickly.",
    ],
    functionalRequirements:
      "Account with SSO · product browse with category, sustainability, price, brand filters · AI recommendations engine · cart + checkout (3 clicks max) · order tracking · review system.",
    nonFunctionalRequirements:
      "Page load < 2s on 3G · 99.9% uptime · WCAG 2.1 AA · support 10K concurrent users · SOC 2 ready.",
    designGuidelines:
      "Follow Material Design 3 with brand-forward photography · dark mode required · use existing typography (Inter) · accent color reserved for sustainability scores.",
    technicalConstraints:
      "Next.js + tRPC · PostgreSQL on AWS RDS · Pinecone for vector search · Salesforce CRM integration · Stripe payments.",
    releaseCriteria:
      "Phase 1 internal beta (100 users) · Phase 2 public beta (1K users) · Phase 3 GA with paid acquisition.",
  },
  BRD: {
    title: "ProcureFlow",
    vision:
      "Launch a B2B procurement portal that automates purchase-order workflows and integrates with our ERP.",
    problemStatement:
      "Procurement currently takes 8 days on average due to manual email approvals, missing SLAs and inconsistent data in the ERP.",
    successMetrics:
      "Reduce PO cycle to < 2 days · cut data-entry time by 60% · hit 95% on-time approvals.",
    stakeholders: "CFO — cost savings · VP Operations — efficiency · IT — integration · Legal — compliance.",
    constraints: "Must integrate with NetSuite · 6-month deadline · no new headcount in year 1 · SOC 2 required.",
    timeline: "Q1 design sprint · Q2 build · Q3 pilot with 2 BUs · Q4 enterprise rollout.",
    additionalContext:
      "Competitor analysis shows 3 vendors offer similar portals; differentiation is ERP-native design.",
    businessObjectives: [
      "Reduce procurement cycle time from 8 days to under 2 days within 6 months.",
      "Cut data-entry hours by 60% across procurement and finance teams.",
      "Improve on-time approval rate from 60% to 95%.",
      "Achieve payback on the build within 14 months through labor savings.",
    ],
    targetAudience:
      "Primary: Mid-market procurement managers (50–500 employees). Secondary: Finance approvers and department heads.",
    keyFeatures: [
      "One-click PO creation from approved catalogs.",
      "Configurable multi-step approval workflows.",
      "Real-time ERP sync with NetSuite.",
      "Spend analytics dashboard with custom reports.",
    ],
    budget: "$300K – $450K",
  },
};
