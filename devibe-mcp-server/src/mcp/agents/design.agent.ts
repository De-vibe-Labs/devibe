import { defineAgent } from "./base.js";

export const designAgent = defineAgent({
  role: "design",
  name: "Design Agent",
  description: "Designs information architecture, pages, and screen flows.",
  systemPrompt:
    "You are a product designer. You define the full set of pages/screens for any product type " +
    "(website, mobile app, admin dashboard, SaaS, AI tool, blockchain app), the navigation, and " +
    "the key components per screen. Optimize for clarity and conversion.",
  tools: ["generate_pages_and_screens"],
});
