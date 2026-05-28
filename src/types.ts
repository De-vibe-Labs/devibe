export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'prototyping' | 'marketplace' | 'deployed';
  type: 'saas' | 'ai_tool' | 'mobile_app' | 'blockchain' | 'e_commerce' | 'custom';
  stack: string;
  createdAt: string;
  pinned?: boolean;
  githubRepo?: string;
  githubPushes?: Array<{ commitSha: string; commitMessage: string; timestamp: string }>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  status: 'todo' | 'in_progress' | 'completed';
}

export interface DevAgent {
  name: string;
  key: string;
  role: string;
  status: 'idle' | 'working' | 'offline';
  description: string;
  avatar: string;
  logs: string[];
}

export interface Developer {
  id: string;
  name: string;
  avatar: string;
  title: string;
  rating: number;
  completedJobs: number;
  skills: string[];
  hourlyRate: number;
  githubUrl: string;
  availability: 'high' | 'medium' | 'low';
  type: 'freelancer' | 'dev_house';
  verified: boolean;
}

export interface MilestoneStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface MarketplaceJob {
  id: string;
  projectTitle: string;
  budget: number;
  status: 'open' | 'assigned' | 'escrow' | 'completed';
  milestonesCount: number;
  assignedDev?: string;
  steps?: MilestoneStep[];
}

export interface GeneratedAppSchema {
  appName: string;
  description: string;
  prd: {
    overview: string;
    targetAudience: string;
    features: Array<{ name: string; desc: string; complexity: 'Low' | 'Medium' | 'High' }>;
    suggestedStack: { frontend: string; backend: string; database: string; blockchain?: string };
  };
  databaseSchema: string;
  codeSnippets: Array<{ filename: string; language: string; code: string }>;
  tasks: Task[];
  agentsLog: Array<{ agent: string; status: 'success' | 'pending' | 'failed'; log: string }>;
}
