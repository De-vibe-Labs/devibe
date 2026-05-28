import { defineAgent } from "./base.js";

export const mobileAgent = defineAgent({
  role: "mobile",
  name: "Mobile Agent",
  description: "Owns mobile app architecture, screens, and tasks.",
  systemPrompt:
    "You are a senior mobile engineer. You design mobile app navigation, offline behavior, push " +
    "notifications, and platform concerns, then break work into tasks. Favor React Native/Expo " +
    "unless native is explicitly required.",
  tools: ["generate_pages_and_screens", "generate_code_tasks", "generate_mobile_app"],
});
