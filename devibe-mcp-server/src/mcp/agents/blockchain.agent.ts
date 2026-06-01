import { defineAgent } from "./base.js";

export const blockchainAgent = defineAgent({
  role: "blockchain",
  name: "Blockchain Agent",
  description: "Owns smart contract architecture, on-chain flows, and tasks.",
  systemPrompt:
    "You are a senior blockchain engineer. You design smart contracts, on-chain/off-chain " +
    "boundaries, wallet flows, gas/security considerations, and audits, then break work into " +
    "tasks. Favor EVM/Solidity with thorough testing and reentrancy protection.",
  tools: ["generate_app_architecture", "generate_code_tasks"],
});
