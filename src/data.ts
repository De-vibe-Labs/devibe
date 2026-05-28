import { Developer, Project, MarketplaceJob } from './types';

export const STARTER_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "AuraNFT Market",
    description: "Decentralized fine-art marketplace on Base with smart contract escrow integrations.",
    status: "deployed",
    type: "blockchain",
    stack: "React, Hardhat, Solidity, Tailwind",
    createdAt: "2026-05-10",
    pinned: true
  },
  {
    id: "proj-2",
    name: "ScribeAI Summarizer",
    description: "Meeting note categorization engine using Gemini and voice audio streams.",
    status: "prototyping",
    type: "ai_tool",
    stack: "Express, TypeScript, @google/genai, React",
    createdAt: "2026-05-24",
    pinned: true
  },
  {
    id: "proj-3",
    name: "ZenFlow Mobile",
    description: "Breathe trackers with local backup and customizable motion graphics.",
    status: "draft",
    type: "mobile_app",
    stack: "Expo, React Native, NativeWind",
    createdAt: "2026-05-27"
  }
];

export const MARKETPLACE_DEVELOPERS: Developer[] = [
  {
    id: "dev-1",
    name: "Elena Rostova",
    title: "Senior Full-Stack & Smart Contract Architect",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    rating: 4.9,
    completedJobs: 42,
    skills: ["React", "TypeScript", "Solidity", "Node.js", "Tailwind CSS"],
    hourlyRate: 85,
    githubUrl: "https://github.com/rostova-design",
    availability: "high",
    type: "freelancer",
    verified: true
  },
  {
    id: "dev-2",
    name: "Marcus Thorne",
    title: "AI Integrations Specialist & Python Developer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    rating: 4.8,
    completedJobs: 29,
    skills: ["Python", "Gemini API", "FastAPI", "PostgreSQL", "LangChain"],
    hourlyRate: 75,
    githubUrl: "https://github.com/mthorne-codes",
    availability: "medium",
    type: "freelancer",
    verified: true
  },
  {
    id: "dev-3",
    name: "Nexus Labs Software",
    title: "Boutique Full-Stack & Systems Engineering Dev House",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    rating: 5.0,
    completedJobs: 138,
    skills: ["Next.js", "Solidity", "Rust", "Expo Router", "Drizzle ORM", "Redis"],
    hourlyRate: 150,
    githubUrl: "https://github.com/nexus-labs-agency",
    availability: "high",
    type: "dev_house",
    verified: true
  },
  {
    id: "dev-4",
    name: "Kaito Tanaka",
    title: "Mobile App Engineer & Expo Enthusiast",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    rating: 4.7,
    completedJobs: 19,
    skills: ["Expo Router", "React Native", "NativeWind", "Firebase Auth"],
    hourlyRate: 65,
    githubUrl: "https://github.com/tanakak-dev",
    availability: "low",
    type: "freelancer",
    verified: false
  },
  {
    id: "dev-5",
    name: "VibeCoders Collective",
    title: "Extreme Agile MVP Launch Specialists",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
    rating: 4.9,
    completedJobs: 67,
    skills: ["React", "Hono", "Vite", "Drizzle DB", "PostgreSQL", "Stripe API"],
    hourlyRate: 110,
    githubUrl: "https://github.com/vibecoders-net",
    availability: "high",
    type: "dev_house",
    verified: true
  }
];

export const RECENT_JOBS: MarketplaceJob[] = [
  { id: "job-1", projectTitle: "AuraNFT Market - Base Escrow Audit", budget: 1200, status: "completed", milestonesCount: 2, assignedDev: "Elena Rostova" },
  { id: "job-2", projectTitle: "Dynamic Token Liquidity Dashboard", budget: 3500, status: "escrow", milestonesCount: 3, assignedDev: "Nexus Labs Software" },
  { id: "job-3", projectTitle: "ZenFlow Custom Wavelet Sound Engine", budget: 850, status: "open", milestonesCount: 1 }
];

export const TEMPLATE_CATEGORIES = [
  {
    name: "SaaS Dashboards",
    templates: [
      { id: "t-1", name: "Modern Analytics Command Center", desc: "Express + Vite real-time grid charting with responsive panels.", stack: "TypeScript, Tailwind CSS, Recharts" },
      { id: "t-2", name: "Corporate Fleet Logistical Flow", desc: "Interactive map assets mapping, route planning integrations.", stack: "React, Tailwind, Google Maps API" }
    ]
  },
  {
    name: "AI & Automation Tools",
    templates: [
      { id: "t-3", name: "Scribe Speech-to-Summary Suite", desc: "Dynamic conversation summarize engine with customizable prompt builders.", stack: "Gemini SDK, Audio Recording, React" },
      { id: "t-4", name: "Neural Vision Classification Pipeline", desc: "Upload base64 snapshots and run smart label recognition models.", stack: "Node.js, Express, @google/genai" }
    ]
  },
  {
    name: "Blockchain & Decentralized Web",
    templates: [
      { id: "t-5", name: "Decentralized Escrow Bid Marketplace", desc: "Contract deployments with local MetaMask connection widgets.", stack: "Solidity Core, Wagmi, React" },
      { id: "t-6", name: "Solana Real-time Token Stream", desc: "Display streaming tokens, price changes, and historical charts.", stack: "Solana Web3, CoinGecko APIs, Recharts" }
    ]
  }
];

export const DOC_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      { id: "doc-1", title: "Key Architectural Vision", content: "Devibe wraps standard development lifecycles into active agent workflows. You write prompts; we coordinate tasks, file creation, code generation, and direct manual routing." },
      { id: "doc-2", title: "First Prompt Generation Guide", content: "To start, type in your full product criteria. For example, explain: 'A dark dashboard to visualize carbon emission credits' or 'An online store with Stripe payment integrations'. The model outputs PRDs, custom reactive components and database schematics automatically." }
    ]
  },
  {
    title: "MCP Orchestrator API",
    items: [
      { id: "doc-3", title: "Model Context Protocol Introduction", content: "We support standardized MCP servers. This enables agents to safely access your local file system, inspect Docker clusters, interact with PostgreSQL logs, and write real-time code updates." },
      { id: "doc-4", title: "Writing custom MCP JSON tools", content: "Register tools using standard JSON-RPC. Express endpoints can proxy any custom service tools allowing immediate agent context access: { 'method': 'tools/list', 'params': {} }." }
    ]
  },
  {
    title: "Marketplace Rules",
    items: [
      { id: "doc-5", title: "Escrow and Safe Milestones", content: "Devibe Escrow places budgets safely in smart-contract or Stripe-guaranteed containers. Freelancers are paid out only when the client signs off on GitHub deployment checks." },
      { id: "doc-6", title: "Becoming an Accredited Dev House", content: "Apply with verified agency profiles. Connect your team's GitHub organization to demonstrate clean code and successful Vercel deploy histories." }
    ]
  }
];

export const BLOG_POSTS = [
  {
    id: "bp-1",
    title: "The Rise of Vibe Coding: How Founders Are Shipping Real Apps in Hours",
    preview: "AI generation combined with secure MCP agents has created a new era. We explore why clean layout architecture beats cookie-cutter templates...",
    date: "May 25, 2026",
    readTime: "4 min read"
  },
  {
    id: "bp-2",
    title: "Behind the Tech Stack: Integrating Web3 Decentralized Audits with Local Mock Nodes",
    preview: "Testing smart contract escrow components shouldn't require real gas fees. Learn about Base testnet pipelines bridged automatically...",
    date: "May 18, 2026",
    readTime: "8 min read"
  },
  {
    id: "bp-3",
    title: "Maximizing @google/genai Performance via Structured Response Schemas",
    preview: "Ensure your apps return valid, parseable JSON payloads on every API invocation using Gemini's powerful response schema declarations...",
    date: "May 12, 2026",
    readTime: "6 min read"
  }
];
