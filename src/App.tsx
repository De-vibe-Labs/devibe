import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  Terminal, Cpu, Code2, Globe, Users2, Database, ShieldCheck, Play, 
  Sparkles, Layers, ArrowRight, CheckCircle2, ChevronRight, Bookmark, 
  Clock, DollarSign, ExternalLink, MessageSquare, Plus, Search, 
  Send, RefreshCcw, Copy, Code, FileText, Check, LayoutGrid, Monitor, Smartphone,
  Workflow, Ship, BookOpen, Newspaper, LogOut, CheckSquare, 
  ChevronDown, HelpCircle, Briefcase, Zap, Star, LogIn, UserCheck, User,
  Brain, Rocket
} from 'lucide-react';
import { Project, Task, Developer, MarketplaceJob, GeneratedAppSchema, ChatMessage, JobValidation } from './types';
import { 
  STARTER_PROJECTS, MARKETPLACE_DEVELOPERS, RECENT_JOBS, 
  TEMPLATE_CATEGORIES, DOC_SECTIONS, BLOG_POSTS 
} from './data';
import { useAuth } from './context/AuthContext';
import { DevibeLogo } from './components/DevibeLogo';

// Lazy-load the IDE so Monaco + Sandpack (~1MB) are fetched only when the
// user actually opens the IDE tab — keeps the initial paint cheap.
const IDEPanel = lazy(() => import('./components/IDEPanel'));

// Lazy — Stripe + viem ship behind the pricing tab so they don't bloat first paint.
const BillingPanel = lazy(() => import('./components/BillingPanel'));
import { currentOrigin, firebaseAuthSettingsUrl } from './firebase';

// Lazy — Privy SDK is heavy; only fetch when the user actually needs to sign in.
const PrivyAuthButton = lazy(() =>
  import('./components/PrivyAuthButton').then((m) => ({ default: m.PrivyAuthButton })),
);
const __viteEnv = ((import.meta as unknown as { env: Record<string, string | undefined> }).env) ?? {};
const isPrivyConfigured = (): boolean => Boolean((__viteEnv.VITE_PRIVY_APP_ID || '').trim());
import {
  getAttribution,
  getMyReferralCode,
  buildReferralLink,
  trackReferralSignup,
} from './lib/referral';

export default function App() {
  const { user, loading, error: authError, loginWithGoogle, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Navigation State: 'landing' or 'dashboard'
  const [currentMode, setCurrentMode] = useState<'landing' | 'dashboard'>('landing');

  // Entry flow: chat-first (ChatGPT style) -> optional login -> full app.
  const [appStage, setAppStage] = useState<'chat' | 'login' | 'app'>('chat');
  const [entryPrompt, setEntryPrompt] = useState('');
  const [pendingGeneration, setPendingGeneration] = useState(false);
  
  // Landing Sub-tab: 'home' | 'features' | 'marketplace' | 'templates' | 'docs' | 'blog' | 'pricing'
  const [landingTab, setLandingTab] = useState<'home' | 'features' | 'marketplace' | 'templates' | 'docs' | 'blog' | 'pricing'>('home');
  
  // Dashboard Sub-navigation: 'home' | 'builder' | 'projects' | 'marketplace' | 'docs' | 'settings'
  const [dashTab, setDashTab] = useState<'home' | 'builder' | 'projects' | 'marketplace' | 'docs' | 'settings'>('home');

  // Interactive Live States
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [marketplaceJobs, setMarketplaceJobs] = useState<MarketplaceJob[]>([]);
  const [developers] = useState<Developer[]>(MARKETPLACE_DEVELOPERS);
  
  // Marketplace Search & Filter
  const [devFilter, setDevFilter] = useState<'all' | 'freelancer' | 'dev_house'>('all');
  const [devSearch, setDevSearch] = useState('');
  
  // Job Posting State
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobBudget, setNewJobBudget] = useState('1500');
  const [newJobDesc, setNewJobDesc] = useState('');
  
  // Docs search state
  const [docSearch, setDocSearch] = useState('');
  const [activeDocId, setActiveDocId] = useState('doc-1');

  // AI Generation States
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [generatedApp, setGeneratedApp] = useState<GeneratedAppSchema | null>(null);
  const [activeGenTab, setActiveGenTab] = useState<'ide' | 'live_preview' | 'preview' | 'prd' | 'db' | 'tasks'>('ide');
  const [chatPayload, setChatPayload] = useState<{role: 'user' | 'agent', text: string}[]>([]);
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [simDataCount, setSimDataCount] = useState(148);
  const [simLogs, setSimLogs] = useState<string[]>(['[System] Sandbox runtime compiled successfully.', '[System] Awaiting client interact triggers...']);
  const [simCheckedFeatures, setSimCheckedFeatures] = useState<Record<string, boolean>>({});
  const [sqlCopied, setSqlCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Template Search State
  const [templateSearch, setTemplateSearch] = useState('');

  // GitHub Sync States
  const [githubToken, setGithubToken] = useState<string | null>(() => localStorage.getItem("devibe_github_token"));
  const [githubUser, setGithubUser] = useState<any | null>(null);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [githubLoading, setGithubLoading] = useState<boolean>(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [activePushLogs, setActivePushLogs] = useState<string[]>([]);
  const [isPushingCode, setIsPushingCode] = useState<boolean>(false);

  // IDE state
  const [ideTemplate, setIdeTemplate] = useState<'web' | 'expo'>('web');
  const [isExportingFromIDE, setIsExportingFromIDE] = useState(false);

  // Alternative identity (Privy). Tracked separately from Firebase user.
  const [privyIdentity, setPrivyIdentity] = useState<{ id: string; email: string | null } | null>(null);
  const isLoggedIn = Boolean(user) || Boolean(privyIdentity);

  // Role: founders see the builder/projects; developers land in the marketplace.
  type UserRole = 'founder' | 'developer';
  const [userRole, setUserRole] = useState<UserRole>(
    () => (localStorage.getItem('devibe_role') as UserRole) || 'founder',
  );
  const updateUserRole = (r: UserRole) => {
    setUserRole(r);
    localStorage.setItem('devibe_role', r);
  };

  // Job chat + validation
  const [activeChatJobId, setActiveChatJobId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [devTypingForJobId, setDevTypingForJobId] = useState<string | null>(null);
  const [validationJobId, setValidationJobId] = useState<string | null>(null);
  const [validationCriteria, setValidationCriteria] = useState<Record<string, boolean>>({});
  const [validationNotes, setValidationNotes] = useState('');
  const [validationDecision, setValidationDecision] = useState<'approved' | 'changes_requested' | null>(null);
  const chatScrollRef = React.useRef<HTMLDivElement | null>(null);

  // GitHub Fetch Helper
  const fetchGitHubProfileAndRepos = async (tokenValue: string) => {
    setGithubLoading(true);
    setGithubError(null);
    try {
      const userResp = await fetch(`/api/github/user?token=${encodeURIComponent(tokenValue)}`);
      if (!userResp.ok) throw new Error("Could not authenticate GitHub user profile. Token may be expired.");
      const userData = await userResp.json();
      setGithubUser(userData);

      const reposResp = await fetch(`/api/github/repos?token=${encodeURIComponent(tokenValue)}`);
      if (reposResp.ok) {
        const reposData = await reposResp.json();
        setGithubRepos(reposData);
      }
    } catch (err: any) {
      console.error("Error loading GitHub metadata:", err);
      setGithubError(err.message || "Failed to load GitHub data.");
    } finally {
      setGithubLoading(false);
    }
  };

  useEffect(() => {
    if (githubToken) {
      fetchGitHubProfileAndRepos(githubToken);
    }
  }, [githubToken]);

  const handleConnectGitHub = async () => {
    setGithubLoading(true);
    setGithubError(null);
    try {
      const resp = await fetch("/api/github/auth-url");
      if (!resp.ok) throw new Error("Failed to load GitHub Auth URL.");
      const { url } = await resp.json();

      const authWindow = window.open(
        url,
        "github_oauth_popup",
        "width=650,height=750,scrollbars=yes"
      );

      if (!authWindow) {
        setGithubError("Popup blocked. Please allow popups to link with GitHub.");
      }
    } catch (err: any) {
      setGithubError(err.message || "Failed to launch authentication popup.");
    } finally {
      setGithubLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }

      if (event.data?.type === "GITHUB_AUTH_SUCCESS") {
        const token = event.data.token;
        if (token) {
          localStorage.setItem("devibe_github_token", token);
          setGithubToken(token);
          fetchGitHubProfileAndRepos(token);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleDisconnectGitHub = () => {
    localStorage.removeItem("devibe_github_token");
    setGithubToken(null);
    setGithubUser(null);
    setGithubRepos([]);
  };

  const handleLinkRepository = (repoFullName: string) => {
    if (!selectedProject) return;
    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          githubRepo: repoFullName,
          githubPushes: p.githubPushes || []
        };
      }
      return p;
    });
    saveProjectsToStorage(updatedProjects);
    setSelectedProject(prev => prev ? {
      ...prev,
      githubRepo: repoFullName,
      githubPushes: prev.githubPushes || []
    } : null);
  };

  const handleUnlinkRepository = () => {
    if (!selectedProject) return;
    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        const { githubRepo, githubPushes, ...rest } = p;
        return rest as any;
      }
      return p;
    });
    saveProjectsToStorage(updatedProjects);
    setSelectedProject(prev => {
      if (!prev) return null;
      const { githubRepo, githubPushes, ...rest } = prev;
      return rest as any;
    });
  };

  const handleManualPushToGitHub = async () => {
    if (!selectedProject || !githubToken || !selectedProject.githubRepo) return;
    setIsPushingCode(true);
    setActivePushLogs(["[Git Core] Creating fresh repository commit...", "[Git Core] Preparing file tree uploads..."]);
    
    try {
      const pushCode = generatedApp?.codeSnippets?.[0]?.code || "// React Prototype Code";
      const pushSchema = generatedApp?.databaseSchema || "-- Relational database schema";
      const pushDesc = generatedApp?.description || selectedProject.description;
      const pushTitle = generatedApp?.appName || selectedProject.name;

      const resp = await fetch("/api/github/push-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          repo: selectedProject.githubRepo,
          appName: pushTitle,
          code: pushCode,
          schema: pushSchema,
          description: pushDesc,
          commitMsg: `Manual Push Synchronize from Devibe: ${pushTitle}`
        })
      });

      if (!resp.ok) {
        const errJson = await resp.json();
        throw new Error(errJson.error || "Files push failed.");
      }

      const resData = await resp.json();
      
      const newPush = {
        commitSha: resData.commitSha || "dbv-sha",
        commitMessage: `Manual Push Synchronize: ${pushTitle}`,
        timestamp: new Date().toISOString()
      };

      const updatedProjects = projects.map(p => {
        if (p.id === selectedProject.id) {
          return {
            ...p,
            githubPushes: [newPush, ...((p as any).githubPushes || [])]
          };
        }
        return p;
      });

      saveProjectsToStorage(updatedProjects);
      setSelectedProject(prev => prev ? {
        ...prev,
        githubPushes: [newPush, ...((prev as any).githubPushes || [])]
      } : null);

      setActivePushLogs(prev => [
        ...prev,
        `[Success] Pushed commit ${resData.commitSha} to repository!`,
        `[Sync] Remote syncing completed successfully.`
      ]);
    } catch (err: any) {
      console.error(err);
      setActivePushLogs(prev => [
        ...prev,
        `[Failed] Pushing failed: ${err.message || err}`
      ]);
    } finally {
      setIsPushingCode(false);
    }
  };

  // Initial Data Seed
  useEffect(() => {
    const savedProjects = localStorage.getItem('devibe_projects');
    const savedJobs = localStorage.getItem('devibe_jobs');
    
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    } else {
      setProjects(STARTER_PROJECTS);
      localStorage.setItem('devibe_projects', JSON.stringify(STARTER_PROJECTS));
    }

    if (savedJobs) {
      setMarketplaceJobs(JSON.parse(savedJobs));
    } else {
      setMarketplaceJobs(RECENT_JOBS);
      localStorage.setItem('devibe_jobs', JSON.stringify(RECENT_JOBS));
    }

    // Default chat welcoming
    setChatPayload([
      { role: 'agent', text: 'Greetings, Founder! I am Devibe\'s coordinated MCP agent matrix. Type your digital product vision below to generate live database schema blueprints, PRD structures, and full-stack React preview code bases immediately.' }
    ]);
  }, []);

  // Helper: Persist state changes
  const saveProjectsToStorage = (updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem('devibe_projects', JSON.stringify(updated));
  };

  const saveJobsToStorage = (updated: MarketplaceJob[]) => {
    setMarketplaceJobs(updated);
    localStorage.setItem('devibe_jobs', JSON.stringify(updated));
  };

  // Helper: Get or initialize steps for a job
  const getJobSteps = (job: MarketplaceJob) => {
    if (job.steps && job.steps.length > 0) {
      return job.steps;
    }
    // Return standard milestones based on status
    return [
      { id: '1', title: 'Requirements & Design Spec', status: 'completed' as const },
      { id: '2', title: 'Developer Assignment', status: job.status !== 'open' ? 'completed' as const : 'in_progress' as const },
      { id: '3', title: 'Escrow Funding Secured', status: (job.status === 'escrow' || job.status === 'completed') ? 'completed' as const : (job.status === 'assigned' ? 'in_progress' as const : 'pending' as const) },
      { id: '4', title: 'QA Code Verification', status: job.status === 'completed' ? 'completed' as const : 'pending' as const }
    ];
  };

  // Helper: Calculate progress percent based on project steps
  const getJobProgressPercent = (job: MarketplaceJob): number => {
    const steps = getJobSteps(job);
    const completedCount = steps.filter(s => s.status === 'completed').length;
    return Math.round((completedCount / steps.length) * 100);
  };

  // Helper: Toggle individual step
  const toggleJobStep = (jobId: string, stepId: string) => {
    const updated = marketplaceJobs.map(job => {
      if (job.id === jobId) {
        const currentSteps = getJobSteps(job);
        const updatedSteps = currentSteps.map(step => {
          if (step.id === stepId) {
            const nextStatus: 'completed' | 'in_progress' | 'pending' = 
              step.status === 'completed' ? 'pending' : 'completed';
            return { ...step, status: nextStatus };
          }
          return step;
        });

        // Compute overall job status from steps
        const completedCount = updatedSteps.filter(s => s.status === 'completed').length;
        let nextJobStatus = job.status;
        if (completedCount === 4) {
          nextJobStatus = 'completed';
        } else if (completedCount === 3) {
          nextJobStatus = 'escrow';
        } else if (completedCount === 2) {
          nextJobStatus = 'assigned';
        } else {
          nextJobStatus = 'open';
        }

        return {
          ...job,
          status: nextJobStatus,
          steps: updatedSteps
        };
      }
      return job;
    });
    saveJobsToStorage(updated);
  };

  // ————————————————— JOB CHAT —————————————————
  const findDeveloperByName = (name?: string) =>
    name ? developers.find(d => d.name === name) : undefined;

  const appendJobMessages = (jobId: string, newMsgs: ChatMessage[]) => {
    const updated = marketplaceJobs.map(j =>
      j.id === jobId ? { ...j, messages: [...(j.messages ?? []), ...newMsgs] } : j
    );
    saveJobsToStorage(updated);
  };

  const sendChatMessage = (jobId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const job = marketplaceJobs.find(j => j.id === jobId);
    if (!job) return;
    const founderMsg: ChatMessage = {
      id: `msg-${Date.now()}-f`,
      sender: 'founder',
      authorName: user?.displayName || 'You',
      authorAvatar: user?.photoURL || undefined,
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    appendJobMessages(jobId, [founderMsg]);
    setChatInput('');

    // Simulate dev typing + canned reply, status-aware.
    const dev = findDeveloperByName(job.assignedDev);
    if (!dev) return;
    setDevTypingForJobId(jobId);
    const replyText = composeDevReply(job, trimmed);
    window.setTimeout(() => {
      const devMsg: ChatMessage = {
        id: `msg-${Date.now()}-d`,
        sender: 'dev',
        authorName: dev.name,
        authorAvatar: dev.avatar,
        text: replyText,
        timestamp: new Date().toISOString(),
      };
      appendJobMessages(jobId, [devMsg]);
      setDevTypingForJobId(prev => (prev === jobId ? null : prev));
    }, 1200);
  };

  const composeDevReply = (job: MarketplaceJob, founderText: string): string => {
    const lower = founderText.toLowerCase();
    if (/eta|when|deadline|timeline/.test(lower)) {
      return `Tracking to the next milestone — I'll push an update by end of day. Status: ${job.status}.`;
    }
    if (/bug|broken|fix|issue/.test(lower)) {
      return `Got it — reproducing on my end. I'll commit a fix and link the PR in this thread.`;
    }
    if (/scope|change|requirement/.test(lower)) {
      return `Happy to take that on. I'll send a quick scope/timeline note before I start.`;
    }
    if (job.status === 'open' || job.status === 'assigned') {
      return `Thanks for the context. Kicking off Milestone 1 now and will check in after each step.`;
    }
    if (job.status === 'escrow') {
      return `Acknowledged. All milestones are in progress against the escrow — happy to walk through any item before you validate.`;
    }
    return `Thanks — I'll keep this thread updated as I go.`;
  };

  const openChat = (jobId: string) => {
    setActiveChatJobId(jobId);
    // Seed an introduction from the dev on first open.
    const job = marketplaceJobs.find(j => j.id === jobId);
    const dev = findDeveloperByName(job?.assignedDev);
    if (job && dev && (!job.messages || job.messages.length === 0)) {
      const intro: ChatMessage = {
        id: `msg-${Date.now()}-intro`,
        sender: 'dev',
        authorName: dev.name,
        authorAvatar: dev.avatar,
        text: `Hi! I've reviewed "${job.projectTitle}". Ready to start when you are — let me know any priorities or constraints.`,
        timestamp: new Date().toISOString(),
      };
      appendJobMessages(jobId, [intro]);
    }
  };

  // ————————————————— JOB VALIDATION —————————————————
  const allMilestonesComplete = (job: MarketplaceJob): boolean => {
    const steps = getJobSteps(job);
    return steps.length > 0 && steps.every(s => s.status === 'completed');
  };

  const canValidate = (job: MarketplaceJob): boolean =>
    Boolean(job.assignedDev) && job.status === 'escrow' && allMilestonesComplete(job);

  const openValidationModal = (jobId: string) => {
    const job = marketplaceJobs.find(j => j.id === jobId);
    if (!job) return;
    const steps = getJobSteps(job);
    const initial: Record<string, boolean> = {};
    steps.forEach(s => { initial[s.id] = true; });
    setValidationCriteria(initial);
    setValidationNotes('');
    setValidationDecision(null);
    setValidationJobId(jobId);
  };

  const submitValidation = (decision: 'approved' | 'changes_requested') => {
    if (!validationJobId) return;
    const job = marketplaceJobs.find(j => j.id === validationJobId);
    if (!job) return;
    const steps = getJobSteps(job);
    const criteria = steps.map(s => ({ stepId: s.id, title: s.title, passed: !!validationCriteria[s.id] }));
    const validation: JobValidation = {
      decision,
      criteria,
      notes: validationNotes.trim(),
      validatedAt: new Date().toISOString(),
    };

    const updated = marketplaceJobs.map(j => {
      if (j.id !== validationJobId) return j;
      const systemMsg: ChatMessage = {
        id: `msg-${Date.now()}-v`,
        sender: 'system',
        authorName: 'Devibe Escrow',
        text: decision === 'approved'
          ? `Job validated by founder. Payment released from escrow. ${validationNotes.trim() ? `Note: ${validationNotes.trim()}` : ''}`.trim()
          : `Founder requested changes${validationNotes.trim() ? `: ${validationNotes.trim()}` : '.'}`,
        timestamp: new Date().toISOString(),
      };
      return {
        ...j,
        status: decision === 'approved' ? 'completed' as const : j.status,
        validation,
        messages: [...(j.messages ?? []), systemMsg],
      };
    });
    saveJobsToStorage(updated);
    setValidationJobId(null);
  };

  // Auto-scroll the chat panel to the newest message.
  useEffect(() => {
    if (activeChatJobId && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeChatJobId, marketplaceJobs, devTypingForJobId]);

  // Create Project Callback
  const handleAddNewProject = (name: string, desc: string, type: Project['type'], stack: string) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: name || "New Ambient App",
      description: desc || "Auto-scaffolded vibe coded prototype.",
      status: 'draft',
      type: type || 'custom',
      stack: stack || 'React, Tailwind CSS',
      createdAt: new Date().toISOString().split('T')[0]
    };
    const updated = [newProj, ...projects];
    saveProjectsToStorage(updated);
    setSelectedProject(newProj);
    setDashTab('projects');
  };

  // Submit Job Callback
  const handlePostJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim()) return;
    const newJob: MarketplaceJob = {
      id: `job-${Date.now()}`,
      projectTitle: newJobTitle,
      budget: Number(newJobBudget) || 1200,
      status: 'open',
      milestonesCount: 4,
      steps: [
        { id: '1', title: 'Requirements & Design Spec', status: 'completed' as const },
        { id: '2', title: 'Developer Assignment', status: 'pending' as const },
        { id: '3', title: 'Escrow Funding Secured', status: 'pending' as const },
        { id: '4', title: 'QA Code Verification', status: 'pending' as const }
      ]
    };
    const updated = [newJob, ...marketplaceJobs];
    saveJobsToStorage(updated);
    setIsPostingJob(false);
    setNewJobTitle('');
    setNewJobDesc('');
    setLandingTab('marketplace'); // Redirect to check job list
  };

  // Quick prompt presets
  const applyPresetPrompt = (txt: string) => {
    setPromptInput(txt);
    setDashTab('builder');
  };

  // Execute Gemini AI generation!
  const triggerProductionGeneration = async () => {
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    setGenerationLogs([]);
    setGeneratedApp(null);
    
    // Simulate real-time orchestration logs from different agents for exceptional visual feedback
    const logsSequence = [
      "[Product Agent] Analysing requirements blueprint and target user demographics...",
      "[Design Agent] Ingesting Slate Theme requirements, looking up Space Grotesk layout alignments...",
      "[Design Agent] Configured neon purple accent lines and atomic CSS modules.",
      "[Backend Agent] Specifying relational DDL schema matrices & REST client controllers...",
      "[Frontend Agent] Launching hot thread to scaffold responsive React views...",
      "[QA Agent] Running syntax checkers & responsive boundary verifications..."
    ];

    let logIdx = 0;
    const interval = setInterval(() => {
      if (logIdx < logsSequence.length) {
        setGenerationLogs(prev => [...prev, logsSequence[logIdx]]);
        logIdx++;
      } else {
        clearInterval(interval);
      }
    }, 450);

    // Chat context addition
    setChatPayload(prev => [...prev, { role: 'user', text: promptInput }]);

    try {
      const response = await fetch('/api/builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput })
      });
      
      const payload: GeneratedAppSchema & { usingFallback?: boolean, apiError?: string } = await response.json();
      
      clearInterval(interval); // Stop animation just in case
      
      // Inject rest of the architectural logs
      setGenerationLogs(prev => [
        ...prev,
        `[System State] Dynamic code generation finished successfully. Status: Ready. (${payload.usingFallback ? 'Backup model' : 'Gemini 3.5-flash Optimized'})`
      ]);

      setGeneratedApp(payload);
      setIsGenerating(false);
      setActiveGenTab('ide');
      
      // Add agent reply in chat flow
      setChatPayload(prev => [...prev, { 
        role: 'agent', 
        text: `Successfully assembled blueprint for "${payload.appName}"! Check the interactive panels for full Product requirements docs (PRD), full-featured database schema script, and complete frontend component source files.` 
      }]);

      // Automatically register this dynamically as a project!
      const autoRegisteredProject: Project = {
        id: `gen-proj-${Date.now()}`,
        name: payload.appName,
        description: payload.description,
        status: 'prototyping',
        type: promptInput.toLowerCase().includes('solana') || promptInput.toLowerCase().includes('token') ? 'blockchain' : 'ai_tool',
        stack: payload.prd?.suggestedStack?.frontend + " & " + payload.prd?.suggestedStack?.backend,
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      saveProjectsToStorage([autoRegisteredProject, ...projects]);
      
    } catch (err: any) {
      console.error(err);
      clearInterval(interval);
      setGenerationLogs(prev => [...prev, `[Critical Error] Connection failed: ${err.message || 'Server timeout'}. Applying recovery cache...`]);
      setIsGenerating(false);
    }
  };

  // Chat refinement function allowing users to custom request iterations!
  const executeRefineRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!refineInput.trim() || !generatedApp || isRefining || isGenerating) return;

    const instructionText = refineInput.trim();
    setIsRefining(true);
    setRefineInput('');
    setGenerationLogs([]);

    // Add immediate user question to chat dialogue
    setChatPayload(prev => [...prev, { role: 'user', text: instructionText }]);

    // Simulated logs sequence for refactoring
    const logsSequence = [
      `[AI Copilot] Processing customization request: "${instructionText}"...`,
      selectedProject?.githubRepo ? `[AI Copilot] Automatic GitHub Sync: Remote repository ${selectedProject.githubRepo} connected. Preparing auto-commit...` : `[AI Copilot] Local sandbox workspace update initiated...`,
      "[AI Copilot] Restructuring frontend elements & state containers...",
      "[AI Copilot] Analyzing and appending PostgreSQL database instructions...",
      "[AI Copilot] Syncing requirements documents & updating tactical checklists...",
      "[AI Copilot] Verifying compilation state on simulated mobile/desktop interfaces..."
    ];

    let logIdx = 0;
    const interval = setInterval(() => {
      if (logIdx < logsSequence.length) {
        setGenerationLogs(prev => [...prev, logsSequence[logIdx]]);
        logIdx++;
      }
    }, 450);

    try {
      const response = await fetch('/api/builder/chat-refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentApp: generatedApp, 
          instruction: instructionText,
          githubRepo: selectedProject?.githubRepo,
          githubToken: githubToken
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with AI Refined Engine.");
      }

      const payload = await response.json();
      clearInterval(interval);

      // If payload returned new push logs, automatically update our projects list history!
      if (payload.githubPushes && selectedProject) {
        const updatedProjects = projects.map(p => {
          if (p.id === selectedProject.id) {
            return {
              ...p,
              githubPushes: payload.githubPushes
            };
          }
          return p;
        });
        saveProjectsToStorage(updatedProjects);
        setSelectedProject(prev => prev ? {
          ...prev,
          githubPushes: payload.githubPushes
        } : null);
      }

      setGenerationLogs(prev => [
        ...prev,
        payload.githubPushes && payload.githubPushes.length > 0
          ? `[Success] GitHub Auto-Commit ${payload.githubPushes[0].commitSha} pushed successfully!`
          : `[System State] Customization successfully converged.`,
        `[System State] Converged successfully. Status: OK. Ready.`
      ]);

      setGeneratedApp(payload);
      setIsRefining(false);
      setActiveGenTab('ide');

      // Add response to chat
      setChatPayload(prev => [...prev, {
        role: 'agent',
        text: `Successfully customized and enhanced to support your specification: "${instructionText}"!${
          payload.githubPushes && payload.githubPushes.length > 0
            ? ` Pushed a new update commit (${payload.githubPushes[0].commitSha}) automatically to your connected repository ${selectedProject?.githubRepo}!`
            : ""
        } The code components, relational SQL layouts, and operational parameters have all been loaded.`
      }]);
    } catch (err: any) {
      console.error(err);
      clearInterval(interval);
      setGenerationLogs(prev => [...prev, `[Critical Error] Failed to refine app: ${err.message || 'Network Timeout'}`]);
      setIsRefining(false);
    }
  };

  // ————————————————— IDE: Save snapshot & Export to GitHub —————————————————
  const saveIDESnapshot = (code: string) => {
    if (!generatedApp) return;
    const existing = generatedApp.codeSnippets?.[0];
    const headSnippet = {
      filename: existing?.filename || 'App.tsx',
      language: existing?.language || 'tsx',
      code,
    };
    const updated = {
      ...generatedApp,
      codeSnippets: [headSnippet, ...(generatedApp.codeSnippets?.slice(1) ?? [])],
    };
    setGeneratedApp(updated);
    setChatPayload(prev => [
      ...prev,
      { role: 'agent', text: `Snapshot saved (${code.length.toLocaleString()} chars).` },
    ]);
  };

  const exportIDECodeToGitHub = async (code: string): Promise<void> => {
    if (!selectedProject?.githubRepo || !githubToken || !generatedApp) return;
    setIsExportingFromIDE(true);
    try {
      const resp = await fetch('/api/github/push-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken,
          repo: selectedProject.githubRepo,
          appName: generatedApp.appName,
          code,
          schema: generatedApp.databaseSchema || '-- Schema',
          description: generatedApp.description,
          commitMsg: `IDE export from Devibe: ${generatedApp.appName}`,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Push failed with status ${resp.status}`);
      }
      const data = await resp.json();
      const newPush = {
        commitSha: data.commitSha || 'ide-sha',
        commitMessage: `IDE export: ${generatedApp.appName}`,
        timestamp: new Date().toISOString(),
      };
      const updatedProjects = projects.map(p =>
        p.id === selectedProject.id
          ? { ...p, githubPushes: [newPush, ...((p as any).githubPushes || [])] }
          : p,
      );
      saveProjectsToStorage(updatedProjects);
      setSelectedProject(prev =>
        prev ? { ...prev, githubPushes: [newPush, ...((prev as any).githubPushes || [])] } : null,
      );
      setChatPayload(prev => [
        ...prev,
        { role: 'agent', text: `Pushed to ${selectedProject.githubRepo} (commit ${newPush.commitSha.slice(0, 7)}).` },
      ]);
    } catch (err: any) {
      setChatPayload(prev => [
        ...prev,
        { role: 'agent', text: `GitHub export failed: ${err.message ?? 'unknown error'}` },
      ]);
    } finally {
      setIsExportingFromIDE(false);
    }
  };

  const copyToClipboard = (text: string, type: 'sql' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } else {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // Filter developers based on user selection
  const filteredDevs = developers.filter(dev => {
    const matchesFilter = devFilter === 'all' || dev.type === devFilter;
    const matchesSearch = dev.name.toLowerCase().includes(devSearch.toLowerCase()) || 
                          dev.skills.some(s => s.toLowerCase().includes(devSearch.toLowerCase())) ||
                          dev.title.toLowerCase().includes(devSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // ————————————————— ENTRY FLOW (chat-first, ChatGPT-style) —————————————————
  /** Sign-in / chat-submit always lands in the dashboard. Role decides where. */
  const enterApp = (toBuilder: boolean) => {
    setAppStage('app');
    setCurrentMode('dashboard');
    if (toBuilder) {
      setDashTab('builder');
    } else {
      setDashTab(userRole === 'developer' ? 'marketplace' : 'home');
    }
  };

  /** Navigate from anywhere back to the chat-first screen. */
  const returnToChat = () => {
    setAppStage('chat');
    setPendingGeneration(false);
  };

  const submitEntryPrompt = (text?: string) => {
    const value = (text ?? entryPrompt).trim();
    if (!value) return;
    setPromptInput(value);        // carry the prompt into the builder
    setPendingGeneration(true);   // auto-run generation once inside the app
    if (isLoggedIn) {
      enterApp(true);
    } else {
      setAppStage('login');       // first the chat box, then the login page
    }
  };

  const ENTRY_SUGGESTIONS = [
    'A SaaS dashboard for tracking subscription churn with Stripe billing',
    'A mobile app that turns voice notes into organized to-do lists',
    'An NFT marketplace on Base with smart-contract escrow',
    'An AI tool that drafts and scores cold sales emails',
  ];

  // Once authenticated from the login page (Firebase OR Privy), continue in.
  useEffect(() => {
    if (appStage === 'login' && isLoggedIn) {
      enterApp(pendingGeneration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, appStage]);

  // Best-effort referral attribution: fires once per fresh Firebase sign-in.
  useEffect(() => {
    if (user?.uid) void trackReferralSignup({ userId: user.uid });
  }, [user?.uid]);

  // Auto-run generation when we land in the builder with a pending prompt.
  useEffect(() => {
    if (
      appStage === 'app' &&
      pendingGeneration &&
      currentMode === 'dashboard' &&
      dashTab === 'builder' &&
      promptInput.trim() &&
      !isGenerating &&
      !generatedApp
    ) {
      setPendingGeneration(false);
      triggerProductionGeneration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appStage, pendingGeneration, currentMode, dashTab, promptInput, isGenerating]);

  // ————————————————— CHAT-FIRST SCREEN —————————————————
  if (appStage === 'chat') {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-violet-600/30 selection:text-white flex flex-col">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-10 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Minimal top bar */}
        <header className="relative z-10 px-4 h-16 flex items-center justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <DevibeLogo size={32} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => enterApp(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            >
              Explore platform
            </button>
            {isLoggedIn ? (
              <button
                onClick={() => enterApp(false)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow active:scale-95 transition"
              >
                <span>Open Devibe</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => { setPendingGeneration(false); setAppStage('login'); }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-slate-700 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </header>

        {/* Centered composer */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-16">
          <div className="w-full max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 text-xs font-mono mb-6">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>Idea → product, in one prompt</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
              What do you want to build?
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mb-8">
              Describe your app, website, AI tool, or blockchain product. Devibe's agents handle the rest.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); submitEntryPrompt(); }}
              className="relative"
            >
              <div className="flex items-end gap-2 bg-[#0F1424] border border-slate-700 focus-within:border-violet-500/60 rounded-2xl p-2.5 shadow-2xl shadow-violet-950/20 transition">
                <textarea
                  value={entryPrompt}
                  onChange={(e) => setEntryPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEntryPrompt(); }
                  }}
                  rows={1}
                  placeholder="Message Devibe…"
                  className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-100 placeholder-slate-500 px-2 py-2 max-h-40"
                />
                <button
                  type="submit"
                  disabled={!entryPrompt.trim()}
                  className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition active:scale-95"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {ENTRY_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submitEntryPrompt(s)}
                  className="text-left text-xs text-slate-300 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/70 hover:border-violet-500/40 rounded-full px-3.5 py-1.5 transition"
                >
                  {s}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-600 mt-8">
              You'll be asked to sign in to generate and save your project.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ————————————————— LOGIN PAGE —————————————————
  if (appStage === 'login') {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-violet-600/30 selection:text-white flex flex-col">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>

        <header className="relative z-10 px-4 h-16 flex items-center justify-between max-w-5xl mx-auto w-full">
          <button onClick={() => setAppStage('chat')} className="flex items-center gap-2">
            <DevibeLogo size={32} />
          </button>
          <button
            onClick={() => setAppStage('chat')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          >
            ← Back to chat
          </button>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm">
            <div className="bg-[#0F1424] border border-slate-800 rounded-2xl p-7 shadow-2xl shadow-violet-950/20">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 mb-4">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="font-display text-xl font-bold text-white mb-1">Sign in to Devibe</h1>
                <p className="text-slate-400 text-xs">
                  {pendingGeneration
                    ? 'Sign in to generate your project and keep your work.'
                    : 'Sign in to access your projects, marketplace, and console.'}
                </p>
              </div>

              {entryPrompt.trim() && pendingGeneration && (
                <div className="mb-5 bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-left">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 mb-1">
                    <MessageSquare className="w-3 h-3 text-violet-400" />
                    <span>YOUR PROMPT</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-3">{entryPrompt}</p>
                </div>
              )}

              {/* Role selector — decides which screen they land on after sign-in. */}
              <div className="mb-5">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Sign in as</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateUserRole('founder')}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                      userRole === 'founder'
                        ? 'bg-violet-600/15 border-violet-500/50 text-violet-100'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    Founder
                    <div className="text-[9px] font-normal text-slate-400 mt-0.5">Build & ship products</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateUserRole('developer')}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                      userRole === 'developer'
                        ? 'bg-cyan-600/15 border-cyan-500/50 text-cyan-100'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    Developer
                    <div className="text-[9px] font-normal text-slate-400 mt-0.5">Pick up paid jobs</div>
                  </button>
                </div>
              </div>

              <button
                onClick={loginWithGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition active:scale-95 disabled:opacity-60"
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-slate-900 animate-spin"></span>
                ) : (
                  <LogIn className="w-4 h-4 text-violet-600" />
                )}
                <span>Continue with Google</span>
              </button>

              {isPrivyConfigured() && (
                <>
                  <div className="flex items-center gap-2 my-3 text-[10px] text-slate-600">
                    <span className="flex-1 h-px bg-slate-800" />
                    <span className="font-mono">or</span>
                    <span className="flex-1 h-px bg-slate-800" />
                  </div>
                  <Suspense
                    fallback={
                      <div className="w-full h-10 rounded-xl bg-slate-900 border border-slate-700 animate-pulse" />
                    }
                  >
                    <PrivyAuthButton
                      onAuthenticated={({ id, email }) => {
                        void trackReferralSignup({ userId: id });
                        setPrivyIdentity({ id, email: email ?? null });
                      }}
                    />
                  </Suspense>
                </>
              )}

              {authError && (
                <p className="mt-3 text-[11px] text-red-400 text-center">{authError}</p>
              )}

              {authError && /unauthorized-domain/i.test(authError) && (
                <div className="mt-2 text-left text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 leading-relaxed space-y-2">
                  <p>
                    Google sign-in isn't allowed on this domain yet. Add this origin to your Firebase project's authorized domains, then retry.
                  </p>
                  <div className="flex items-center gap-2 bg-slate-950/60 border border-amber-500/20 rounded p-1.5">
                    <code className="font-mono text-amber-200 truncate flex-1">{currentOrigin}</code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(currentOrigin)}
                      className="px-2 py-0.5 text-[10px] text-amber-100 hover:text-white bg-slate-900 border border-amber-500/30 rounded"
                    >
                      Copy
                    </button>
                  </div>
                  <a
                    href={firebaseAuthSettingsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-amber-200 hover:text-white font-semibold"
                  >
                    Open Firebase → Authentication → Settings →
                  </a>
                  <p className="text-slate-400">Or skip this and use Privy above — it doesn't need the domain allowlist.</p>
                </div>
              )}

              <p className="text-[10px] text-slate-600 text-center mt-5 leading-relaxed">
                By continuing you agree to Devibe's Terms and acknowledge the Privacy Policy.
              </p>
            </div>

            <button
              onClick={() => enterApp(false)}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300 mt-4 transition"
            >
              Explore the platform without signing in →
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-violet-600/30 selection:text-white">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* ————————————————— NAVIGATION HEADERS ————————————————— */}
      {currentMode === 'landing' ? (
        <header id="main-landing-header" className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLandingTab('home')}>
              <DevibeLogo size={36} />
            </div>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <button 
                onClick={() => setLandingTab('home')}
                className={`px-3 py-2 rounded-lg transition ${landingTab === 'home' ? 'text-white bg-slate-800/60' : 'text-slate-400 hover:text-white'}`}
              >
                Home
              </button>
              <button 
                onClick={() => setLandingTab('features')}
                className={`px-3 py-2 rounded-lg transition ${landingTab === 'features' ? 'text-white bg-slate-800/60' : 'text-slate-400 hover:text-white'}`}
              >
                Platform Features
              </button>
              <button 
                onClick={() => setLandingTab('templates')}
                className={`px-3 py-2 rounded-lg transition ${landingTab === 'templates' ? 'text-white bg-slate-800/60' : 'text-slate-400 hover:text-white'}`}
              >
                Templates
              </button>
              <button 
                onClick={() => setLandingTab('marketplace')}
                className={`px-3 py-2 rounded-lg transition ${landingTab === 'marketplace' ? 'text-white bg-slate-800/60' : 'text-slate-400 hover:text-white'}`}
              >
                Dev Marketplace
              </button>
              <button 
                onClick={() => setLandingTab('docs')}
                className={`px-3 py-2 rounded-lg transition ${landingTab === 'docs' ? 'text-white bg-slate-800/60' : 'text-slate-400 hover:text-white'}`}
              >
                Docs
              </button>
              <button 
                onClick={() => setLandingTab('blog')}
                className={`px-3 py-2 rounded-lg transition ${landingTab === 'blog' ? 'text-white bg-slate-800/60' : 'text-slate-400 hover:text-white'}`}
              >
                Insights
              </button>
              <button 
                onClick={() => setLandingTab('pricing')}
                className={`px-3 py-2 rounded-lg transition ${landingTab === 'pricing' ? 'text-white bg-slate-800/60' : 'text-slate-400 hover:text-white'}`}
              >
                Pricing
              </button>
            </nav>

            <div className="flex items-center gap-3 relative">
              {loading ? (
                <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-violet-500 animate-spin"></div>
              ) : user ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded-full"
                  >
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Profile" 
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full border border-violet-500/50 hover:border-violet-400 cursor-pointer object-cover transition"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-xs text-white uppercase hover:bg-violet-500 transition cursor-pointer">
                        {user.displayName?.slice(0, 2) || "U"}
                      </div>
                    )}
                  </button>
                  
                  {showUserDropdown && (
                    <div className="absolute right-0 top-11 w-64 bg-[#0B0F19] border border-slate-800 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
                        {user.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt="Profile" 
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-violet-500/40"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                            {user.displayName?.slice(0, 2) || "U"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-xs truncate">{user.displayName || 'Authorized User'}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="py-2.5 space-y-1.5 text-[10px] text-slate-400 border-b border-slate-800">
                        <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded border border-slate-900">
                          <span className="font-mono text-[9px] text-slate-500">PROVIDER</span>
                          <span className="text-emerald-400 font-bold uppercase tracking-wide text-[8.5px]">Google Auth</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded border border-slate-900">
                          <span className="font-mono text-[9px] text-slate-500">UID</span>
                          <span className="font-mono text-slate-300 font-medium select-all truncate max-w-[120px]">{user.uid}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded border border-slate-900">
                          <span className="font-mono text-[9px] text-slate-500">STATUS</span>
                          <span className="text-violet-400 font-bold text-[8.5px] tracking-wide uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                            Firebase Live
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => {
                          logout();
                          setShowUserDropdown(false);
                        }}
                        className="mt-2.5 w-full py-2 bg-slate-900 hover:bg-red-950/30 hover:text-red-400 border border-slate-800 hover:border-red-900/30 text-slate-300 font-bold rounded-lg transition text-[11px] flex items-center justify-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out Account</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={loginWithGoogle}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-slate-700 bg-slate-800 hover:bg-slate-700 rounded-lg text-white hover:text-white transition shadow active:scale-95 duration-150"
                >
                  <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Google Sign In</span>
                </button>
              )}
              
              <button 
                onClick={() => {
                  setCurrentMode('dashboard');
                  setDashTab('builder');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-violet-900/30 active:scale-95 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                <span>Launch Console</span>
              </button>
            </div>
          </div>
        </header>
      ) : (
        /* DASHBOARD MASTER HEADER */
        <header id="dashboard-system-header" className="sticky top-0 z-40 bg-[#0F1424] border-b border-slate-800 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentMode('landing')}>
                <DevibeLogo size={32} />
              </div>
              <span className="px-2 py-0.5 bg-violet-900/30 text-violet-400 border border-violet-800 rounded text-[10px] font-mono">
                ORGANIZATION: Sandbox Dev
              </span>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                onClick={returnToChat}
                title="Back to the AI chat"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg text-xs font-semibold text-white transition active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>New chat</span>
              </button>
              <button
                onClick={() => setCurrentMode('landing')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Console</span>
              </button>

              {loading ? (
                <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-violet-500 animate-spin"></div>
              ) : user ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/80 border border-slate-800 hover:border-violet-500/50 rounded-full font-medium transition active:scale-95 focus:outline-none"
                  >
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Profile" 
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full border border-violet-500/30 object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center font-bold text-[10px] text-white uppercase">
                        {user.displayName?.slice(0, 2) || "U"}
                      </div>
                    )}
                    <span className="text-xs text-slate-300 max-w-[80px] truncate">{user.displayName?.split(" ")[0]}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </button>

                  {showUserDropdown && (
                    <div className="absolute right-0 top-11 w-64 bg-[#0D1222] border border-slate-800 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800/85">
                        {user.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt="Profile" 
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-violet-500/40"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                            {user.displayName?.slice(0, 2) || "U"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-xs truncate">{user.displayName || 'Authorized User'}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="py-2.5 space-y-1.5 text-[10px] text-slate-400 border-b border-slate-850">
                        <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded border border-slate-900">
                          <span className="font-mono text-[9px] text-slate-500">PROVIDER</span>
                          <span className="text-emerald-400 font-bold uppercase tracking-wide text-[8.5px]">Google Auth</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded border border-slate-900">
                          <span className="font-mono text-[9px] text-slate-500">UID</span>
                          <span className="font-mono text-slate-300 font-medium select-all truncate max-w-[120px]">{user.uid}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-950/40 px-2 py-1.5 rounded border border-slate-900">
                          <span className="font-mono text-[9px] text-slate-500">STATUS</span>
                          <span className="text-violet-400 font-bold text-[8.5px] tracking-wide uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                            Firebase Live
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => {
                          logout();
                          setShowUserDropdown(false);
                        }}
                        className="mt-2.5 w-full py-2 bg-slate-900 hover:bg-red-950/30 hover:text-red-400 border border-slate-800 hover:border-red-900/30 text-slate-300 font-bold rounded-lg transition text-[11px] flex items-center justify-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out Account</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={loginWithGoogle}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-755 bg-slate-900 hover:bg-slate-800 rounded-full text-xs font-semibold text-white transition active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>Google Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ————————————————— PUBLIC LANDING LAYOUT ————————————————— */}
      {currentMode === 'landing' && (
        <main className="pb-24">
          
          {/* LANDING TAB: HOME */}
          {landingTab === 'home' && (
            <div>
              {/* HERO SECTION */}
              <section className="relative px-4 pt-16 pb-20 text-center max-w-5xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 text-xs font-mono mb-6">
                  <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
                  <span>The Vibe Coding Platform for Rapid Deployments</span>
                </div>
                
                <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                  Build production-ready apps, websites, <br/>
                  <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                    AI tools, and blockchain products
                  </span> <br className="hidden sm:inline"/>
                  from a single prompt.
                </h1>

                <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
                  Devibe combines smart prompt-to-app generator engines, Model Context Protocol (MCP) orchestrations, and full developer marketplace handoffs to help founders and agencies ship code 10x faster.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button 
                    onClick={() => {
                      setCurrentMode('dashboard');
                      setDashTab('builder');
                    }}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-xl shadow-indigo-900/40 active:scale-95 transition flex items-center justify-center gap-2 group"
                  >
                    <span>Start Vibe Coding</span>
                    <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => setLandingTab('features')}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold active:scale-95 transition"
                  >
                    Explore Capabilities
                  </button>
                </div>

                {/* VISUAL SHOWCASE PREVIEW FLIGHT */}
                <div className="mt-16 p-2 bg-slate-900/60 border border-slate-800 rounded-2xl max-w-4xl mx-auto shadow-2xl relative">
                  <div className="absolute -top-3 left-6 px-3 py-0.5 bg-brand-purple text-white text-[10px] font-mono rounded">
                    INTERACTIVE SANDBOX EMULATOR
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 text-slate-500 text-xs font-mono">
                    <span className="w-3 h-3 rounded-full bg-red-500/20"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500/20"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500/20"></span>
                    <span className="ml-2 text-slate-400">devibe-sandbox://builder-engine/core-control-v1</span>
                  </div>

                  <div className="p-6 bg-slate-950 text-left">
                    <p className="text-xs text-violet-400 font-mono mb-2">// Select a preset vision to pre-populate the interactive generator Console:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div 
                        onClick={() => applyPresetPrompt("A dual-token automated fitness challenge system on Solana")}
                        className="p-4 bg-[#0F1424] border border-slate-800 hover:border-violet-500/50 cursor-pointer rounded-xl transition group"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-white group-hover:text-violet-400 transition">Solana Fitness Challenge Tracker</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-900/30 text-cyan-400">Crypto</span>
                        </div>
                        <p className="text-xs text-slate-400">Generates custom Solana wallet hook configurations and smart transaction tables.</p>
                      </div>

                      <div 
                        onClick={() => applyPresetPrompt("An enterprise meeting log summarizing dashboard with calendar event hooks")}
                        className="p-4 bg-[#0F1424] border border-slate-800 hover:border-violet-500/50 cursor-pointer rounded-xl transition group"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-white group-hover:text-violet-400 transition">Meeting Notes Summarizer Suite</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-900/30 text-violet-400">AI Tool</span>
                        </div>
                        <p className="text-xs text-slate-400">Leverages Gemini models directly to index uploaded notes and calendar reminders.</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>Click any above preset to test in the builder dashboard immediately</span>
                      <span className="text-brand-blue">Active & Online</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* CORE THREE PILLARS SECTIONS */}
              <section id="features-highlights" className="py-16 border-t border-slate-800 bg-slate-950/30">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="text-center max-w-xl mx-auto mb-12">
                    <h2 className="font-display text-3xl font-bold tracking-tight text-white mb-4">Three Interconnected Systems</h2>
                    <p className="text-slate-400 text-sm">Traditional vibe coding platforms leave you with unfinished raw text. Devibe connects the gaps with real tools and real workforce routing.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* CARD 1 */}
                    <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl relative overflow-hidden group">
                      <div className="p-3 bg-violet-600/10 border border-violet-500/20 rounded-xl w-fit text-violet-400 mb-4">
                        <Cpu className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">1. AI Builder Engine</h3>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        Outputs structured blueprint packages including complete strategic PRDs, real schema relational SQL tables, and modular React code components featuring Tailwind responsive grids and state controllers.
                      </p>
                      <button onClick={() => setLandingTab('features')} className="text-xs font-medium text-violet-400 hover:text-white transition flex items-center gap-1">
                        How it works <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* CARD 2 */}
                    <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl relative overflow-hidden group">
                      <div className="p-3 bg-cyan-600/10 border border-cyan-500/20 rounded-xl w-fit text-cyan-400 mb-4">
                        <Terminal className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">2. MCP Agent Orchestrator</h3>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        Uses standardized Model Context Protocol tools to dispatch tasks asynchronously across specialized developer roles—verifying compilation, validating styling, auditing security and checking deployments.
                      </p>
                      <button onClick={() => setLandingTab('features')} className="text-xs font-medium text-cyan-400 hover:text-white transition flex items-center gap-1">
                        Learn about MCP <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* CARD 3 */}
                    <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl relative overflow-hidden group">
                      <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 rounded-xl w-fit text-emerald-400 mb-4">
                        <Users2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">3. Developer Marketplace</h3>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        Instantly package uncompleted files or elaborate requirements to secure freelancers or vetted dev houses. Manage project milestones with Stripe-backed escrow containers.
                      </p>
                      <button onClick={() => setLandingTab('marketplace')} className="text-xs font-medium text-emerald-400 hover:text-white transition flex items-center gap-1">
                        Explore Talent <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* ————————————————— BRAND DESIGN IDENTITY GUIDELINES PLATFORM ————————————————— */}
              <section id="brand-identity-showcase" className="py-16 border-t border-slate-800/85 bg-slate-950/40 relative">
                <div className="max-w-7xl mx-auto px-4">
                  
                  {/* TITLE BLOCKS */}
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-[#00D4FF] font-black bg-[#00D4FF]/10 px-3 py-1.5 rounded-full border border-[#00D4FF]/20">
                      Standardized Brand Deck
                    </span>
                    <h2 className="font-display text-3xl font-extrabold tracking-tight text-white mt-4 mb-3">
                      Devibe Vision & Structured Brand Guidelines
                    </h2>
                    <p className="text-slate-400 text-xs sm:text-sm">
                      We have engineered our UI aesthetics, token spaces, and interface grids directly around Devibe's official cohesive visual specification.
                    </p>
                  </div>

                  {/* MAIN BENTO CONTAINER */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    
                    {/* COL 1: LOGO VARIATIONS (4 cols) */}
                    <div className="lg:col-span-4 p-6 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-mono text-[#6E3CFB] uppercase tracking-widest font-bold">Aesthetic Asset Suite</span>
                        <h3 className="text-base font-bold text-white mt-1 mb-4">Logo Variations & App Icon</h3>
                        
                        <div className="space-y-4">
                          {/* Main logo mark */}
                          <div className="p-4 bg-[#0B0F19] border border-slate-800 rounded-xl flex items-center justify-center">
                            <DevibeLogo size={42} />
                          </div>
                          
                          {/* Row: Symbol / Minimal light / Dark block */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center justify-center text-center">
                              <span className="text-[8px] font-mono text-slate-500 mb-1.5">APP ICON</span>
                              <div className="w-12 h-12 bg-[#0B0F19] border border-slate-800 rounded-xl flex items-center justify-center p-1.5 hover:scale-105 transition shadow-lg">
                                <DevibeLogo size={28} hideText={true} />
                              </div>
                            </div>
                            <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center justify-center text-center">
                              <span className="text-[8px] font-mono text-slate-500 mb-2">SYMBOL ONLY</span>
                              <div className="hover:rotate-12 transition duration-300">
                                <DevibeLogo size={32} hideText={true} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-5 pt-4 border-t border-slate-850/80 text-[10px] text-slate-400 leading-relaxed">
                        The icon embeds a gorgeous four-point spark inside a structured "D" enclosure with standard electronics terminal circuit extension vectors.
                      </div>
                    </div>

                    {/* COL 2: BRAND COLORS (4 cols) */}
                    <div className="lg:col-span-4 p-6 bg-slate-900/30 border border-slate-800 rounded-2xl">
                      <span className="text-[9px] font-mono text-[#00D4FF] uppercase tracking-widest font-bold">Palette Specification</span>
                      <h3 className="text-base font-bold text-white mt-1 mb-4">Cohesive Brand Colors</h3>
                      
                      <div className="space-y-3">
                        {/* Primary Purple */}
                        <div className="flex items-center justify-between p-2.5 bg-[#6E3CFB]/10 border border-[#6E3CFB]/20 rounded-xl hover:bg-[#6E3CFB]/15 transition">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#6E3CFB] border border-white/10 shrink-0 shadow"></div>
                            <div>
                              <p className="text-xs font-bold text-white">Primary Purple</p>
                              <p className="text-[10px] text-slate-400 font-mono">#6E3CFB</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-[#6E3CFB]/20 text-[#9069ff] px-2 py-0.5 rounded font-mono font-bold">Primary</span>
                        </div>

                        {/* Primary Blue */}
                        <div className="flex items-center justify-between p-2.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl hover:bg-[#2563EB]/15 transition">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#2563EB] border border-white/10 shrink-0 shadow"></div>
                            <div>
                              <p className="text-xs font-bold text-white">Primary Blue</p>
                              <p className="text-[10px] text-slate-400 font-mono">#2563EB</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-[#2563EB]/20 text-[#5c8fff] px-2 py-0.5 rounded font-mono font-bold">Base</span>
                        </div>

                        {/* Accent Cyan */}
                        <div className="flex items-center justify-between p-2.5 bg-[#00D4FF]/10 border border-[#00D4FF]/20 rounded-xl hover:bg-[#00D4FF]/15 transition">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#00D4FF] border border-white/10 shrink-0 shadow"></div>
                            <div>
                              <p className="text-xs font-bold text-white">Accent Cyan</p>
                              <p className="text-[10px] text-slate-400 font-mono">#00D4FF</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-[#00D4FF]/20 text-[#3be6ff] px-2 py-0.5 rounded font-mono font-bold">Accent</span>
                        </div>

                        {/* Dark Navy */}
                        <div className="flex items-center justify-between p-2.5 bg-[#0B0F19]/15 border border-[#0B0F19]/50 rounded-xl">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#0B0F19] border border-slate-800 shrink-0 shadow"></div>
                            <div>
                              <p className="text-xs font-bold text-white">Dark Navy (Canvas)</p>
                              <p className="text-[10px] text-slate-400 font-mono">#0B0F19</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-mono border border-slate-800">Background</span>
                        </div>
                      </div>
                    </div>

                    {/* COL 3: SATOSHI TYPOGRAPHY (4 cols) */}
                    <div className="lg:col-span-4 p-6 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">Standard Typography</span>
                        <h3 className="text-base font-bold text-white mt-1 mb-2">Typography & Character Set</h3>
                        <p className="text-[11px] text-slate-400 mb-4">Satoshi (paired with Space Grotesk/Inter as robust system standards) conveying deep-tech, elegant geometric form.</p>
                        
                        <div className="p-4 bg-slate-950/90 border border-slate-800/80 rounded-xl space-y-3 font-display">
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-extrabold text-white">Aa</span>
                            <span className="text-xs text-slate-400 uppercase font-mono tracking-widest">Satoshi Pro</span>
                          </div>
                          <div className="text-[9px] font-mono text-slate-500 tracking-tight leading-relaxed break-all select-all">
                            ABCDEFGHIJKLMNOPQRSTUVWXYZ<br/>
                            abcdefghijklmnopqrstuvwxyz<br/>
                            0123456789 (Core Numeric Matrices)
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-850 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                        <span>AESTHETIC VIBE:</span>
                        <span className="text-[#00D4FF] font-semibold">MODERN • CLEAN • INTELLIGENT</span>
                      </div>
                    </div>

                  </div>

                  {/* 5 KEY FEATURE PLATES SHOWCASE */}
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-5">
                      <h4 className="text-white text-xs font-mono uppercase tracking-widest">The Five Key Feature Verticals</h4>
                      <span className="h-px bg-slate-800 flex-1 mx-4 hidden sm:block"></span>
                      <span className="text-[9px] text-slate-400 font-mono">DIRECT BRAND ALIGNMENT</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      
                      {/* CARD 1: AI-POWERED */}
                      <div className="p-4 bg-slate-900/20 border border-violet-500/20 rounded-xl hover:border-violet-500/40 transition-all duration-300 group">
                        <div className="w-8 h-8 rounded-lg bg-[#6E3CFB]/10 border border-[#6E3CFB]/30 flex items-center justify-center text-[#6E3CFB] mb-3 group-hover:scale-110 transition-transform">
                          <Brain className="w-4 h-4 text-[#9069ff]" />
                        </div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">AI-POWERED</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                          Smart code generators parsing vision text directly to complete relational tables.
                        </p>
                      </div>

                      {/* CARD 2: VIBE CODING */}
                      <div className="p-4 bg-slate-900/20 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-all duration-300 group">
                        <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/30 flex items-center justify-center text-[#2563EB] mb-3 group-hover:scale-110 transition-transform">
                          <Code2 className="w-4 h-4 text-blue-400" />
                        </div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">VIBE CODING</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                          Formulate systems purely via natural prompt iterations. Bypass rigid config codes.
                        </p>
                      </div>

                      {/* CARD 3: MCP AGENTS */}
                      <div className="p-4 bg-slate-900/20 border border-cyan-500/20 rounded-xl hover:border-cyan-500/40 transition-all duration-300 group">
                        <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/30 flex items-center justify-center text-[#00D4FF] mb-3 group-hover:scale-110 transition-transform">
                          <Workflow className="w-4 h-4 text-cyan-400" />
                        </div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">MCP AGENTS</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                          Unified context protocol brokers orchestrating QA, frontend and backend sub-routines.
                        </p>
                      </div>

                      {/* CARD 4: DEVELOPER NETWORK */}
                      <div className="p-4 bg-slate-900/20 border border-indigo-500/20 rounded-xl hover:border-indigo-500/40 transition-all duration-300 group">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                          <Users2 className="w-4 h-4" />
                        </div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">DEVELOPER NETWORK</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                          Bridge uncompleted code directly to vetted dev houses backed by Stripe escrow funds.
                        </p>
                      </div>

                      {/* CARD 5: DEPLOY ANYWHERE */}
                      <div className="p-4 bg-slate-900/20 border border-emerald-500/20 rounded-xl hover:border-emerald-500/40 transition-all duration-300 group">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                          <Rocket className="w-4 h-4" />
                        </div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">DEPLOY ANYWHERE</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                          One-click deployments to local testbeds, Cloud Run, Supabase, or automated Docker files.
                        </p>
                      </div>

                    </div>
                  </div>

                </div>
              </section>

              {/* LIVE COUNTERS & METRIC PROOFS */}
              <section className="py-12 border-t border-b border-slate-800 bg-[#0C111F]">
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div>
                    <p className="text-3xl sm:text-4xl font-extrabold text-white font-mono">14,290+</p>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Prototypes Generated</p>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-extrabold text-brand-blue font-mono">89</p>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Vetted Dev Houses</p>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-extrabold text-violet-400 font-mono">12.5 hrs</p>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Avg Time to Ship MVP</p>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">$1.4M+</p>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Escrow Funds Processed</p>
                  </div>
                </div>
              </section>

              {/* TESTIMONIAL BENTO */}
              <section className="py-16 max-w-7xl mx-auto px-4">
                <div className="text-center max-w-xl mx-auto mb-10">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">Loved by Builders globally</h2>
                  <p className="text-slate-400 text-xs mt-2">Read real quotes from non-technical founders and specialized engineering houses.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-300 italic mb-4">"We generated the complete database Postgres architecture and starter React component for our pet subscription tool in 3 seconds. Our freelance devElena was able to sign on and deploy it within days!"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                      <div>
                        <p className="text-xs font-bold text-white">Marcus Sterling</p>
                        <p className="text-[10px] text-slate-500">Founder, PetPantry</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-300 italic mb-4">"MCP dynamic orchestration is crazy. The agents auto-review and run builds in the cloud sandboxes. We saved dozens of hours mapping API routes to our blockchain ledger prototypes."</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                      <div>
                        <p className="text-xs font-bold text-white">Yuki Sato</p>
                        <p className="text-[10px] text-slate-500">Lead Tech, Wave3 Labs</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-300 italic mb-4">"As a boutique software agency, we find quality, warm-lead jobs on Devibe. We verify execution on client code bases instantly and get paid out via direct Stripe escrows safely."</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                      <div>
                        <p className="text-xs font-bold text-white">Alex Volkov</p>
                        <p className="text-[10px] text-slate-500">Partner, Nexus Software</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* CALL TO ACTION */}
              <section className="py-12 bg-gradient-to-r from-violet-900/30 via-slate-900 to-[#0F1424] border-t border-slate-800">
                <div className="max-w-4xl mx-auto text-center px-4">
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-2">Ready to bring your vibe idea to life?</h2>
                  <p className="text-slate-400 text-xs sm:text-sm mb-6 max-w-lg mx-auto">Skip the tedious boilerplate configurations. Generate clean product specs, deployable schematics, and access real builders instantly.</p>
                  <button 
                    onClick={() => {
                      setCurrentMode('dashboard');
                      setDashTab('builder');
                    }}
                    className="px-6 py-3 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-100 transition active:scale-95 text-xs inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-violet-600 animate-pulse" />
                    <span>Open Generation Dashboard</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* LANDING TAB: FEATURES */}
          {landingTab === 'features' && (
            <div className="max-w-5xl mx-auto px-4 py-12">
              <div className="text-center mb-12">
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-3">Devibe Platform Capabilities</h1>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">Explore the deep-tech modules empowering professional product generation and cloud containerization workflows.</p>
              </div>

              <div className="space-y-12">
                {/* AI BUILDER */}
                <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <span className="px-2 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded text-[10px] font-mono uppercase tracking-wide">Dynamic Blueprinting</span>
                    <h2 className="text-2xl font-bold text-white mt-2 mb-3">1. Smart AI Builder</h2>
                    <p className="text-xs text-slate-300 leading-relaxed space-y-2">
                       Our LLM integration produces a robust developer scaffolding output. Instead of simple mockup images, you get fully parsed JSON products containing SQL database schemas, product specification files (PRD), and functional React components formatted with Tailwind CSS utility classes.
                    </p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                        Relational Database DDL generation optimized for standard postgres
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                        Complete state-driven screen components previewed live
                      </li>
                    </ul>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between border-b border-slate-800/85 pb-2 mb-3 text-[10px] font-mono text-slate-400">
                      <span>POST /api/builder/generate</span>
                      <span className="text-green-400">200 OK</span>
                    </div>
                    <pre className="text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre">
{`{
  "appName": "VeloToken",
  "prd": {
    "targetAudience": "Crypto Investors",
    "featuresCount": 8
  },
  "suggestedStack": {
    "frontend": "Next.js 14",
    "backend": "Hono"
  }
}`}
                    </pre>
                  </div>
                </div>

                {/* MCP AGENT WORKFLOWS */}
                <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="order-2 md:order-1 p-4 bg-slate-950 rounded-xl border border-slate-800/80">
                    <pre className="text-[10px] text-violet-400 font-mono overflow-x-auto whitespace-pre">
{`$ mcp-orchestration list-tools
[QA Agent] Found: check-accessibility
[Backend Agent] Found: audit-schema-ddl
[Deployment Agent] Found: railway-webhook-test
[System Status] Orchestrator loops ready`}
                    </pre>
                  </div>
                  <div className="order-1 md:order-2">
                    <span className="px-2 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded text-[10px] font-mono uppercase tracking-wide">Agent Integration</span>
                    <h2 className="text-2xl font-bold text-white mt-2 mb-3">2. Model Context Protocol Orchestration</h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      We support unified orchestration protocol layers which enable decentralized smart agents to read local project scopes, test compilation correctness, draft unit tests, and provide rigorous audit feedback before building final artifacts.
                    </p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        Standardized JSON-RPC agent tool calls
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        Modular role division (Design vs QA vs Frontend)
                      </li>
                    </ul>
                  </div>
                </div>

                {/* DEPLOYMENT AGENT SYSTEM */}
                <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-mono uppercase tracking-wide">Production Launchers</span>
                    <h2 className="text-2xl font-bold text-white mt-2 mb-3">3. Production Deployment Center</h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Connect your production configurations to cloud servers instantly. With one-click configurations, our platform outlines automated deploy workflows on providers like Vercel, Railway, or direct Supabase instances, ensuring secure access credentials.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 text-center font-mono py-8">
                    <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-3">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-white">READY FOR CONTAINERIZATION</p>
                    <p className="text-[10px] text-slate-500 mt-1">Docker setup successfully generated</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LANDING TAB: TEMPLATES */}
          {landingTab === 'templates' && (
            <div className="max-w-6xl mx-auto px-4 py-12">
              <div className="text-center mb-10">
                <h1 className="font-display text-3xl font-extrabold text-white mb-2">Pre-Configured Architecture Templates</h1>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">Kickstart your generation. These templates contain pre-scaffolded routing structures optimized for developer success.</p>
                
                {/* Search Bar */}
                <div className="max-w-md mx-auto mt-6 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search templates (e.g., SaaS, Solana, Gemini)..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-10">
                {TEMPLATE_CATEGORIES.map((cat, idx) => {
                  const filteredTemplates = cat.templates.filter(tpl => 
                    tpl.name.toLowerCase().includes(templateSearch.toLowerCase()) || 
                    tpl.desc.toLowerCase().includes(templateSearch.toLowerCase()) || 
                    tpl.stack.toLowerCase().includes(templateSearch.toLowerCase())
                  );

                  if (filteredTemplates.length === 0) return null;

                  return (
                    <div key={idx}>
                      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2 mb-4">
                        {cat.name}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredTemplates.map((template) => (
                          <div 
                            key={template.id}
                            className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-violet-500/50 transition cursor-pointer flex flex-col justify-between"
                            onClick={() => applyPresetPrompt(template.name + " - " + template.desc)}
                          >
                            <div>
                              <p className="text-sm font-bold text-white mb-1 group-hover:text-violet-400">{template.name}</p>
                              <p className="text-xs text-slate-400 mb-4">{template.desc}</p>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                              <span>STACK: {template.stack}</span>
                              <span className="text-violet-400 font-semibold flex items-center gap-1">
                                Apply Preset <Sparkles className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LANDING TAB: MARKETPLACE */}
          {landingTab === 'marketplace' && (
            <div className="max-w-6xl mx-auto px-4 py-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                  <h1 className="font-display text-3xl font-extrabold text-white mb-1">Developer & Freelancer Marketplace</h1>
                  <p className="text-slate-400 text-sm">Vibe coding is the best way to start. But when you need complex security audits, connect with professional developers.</p>
                </div>
                <button 
                  onClick={() => setIsPostingJob(true)}
                  className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow transition active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post Custom Task / Job</span>
                </button>
              </div>

              {/* POSTING JOB MODALE IF TRUE */}
              {isPostingJob && (
                <div className="mb-8 p-6 bg-[#0F1424] border border-violet-500/30 rounded-2xl relative">
                  <button 
                    onClick={() => setIsPostingJob(false)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white font-bold text-xs"
                  >
                    ✕ Dismiss
                  </button>
                  <h3 className="text-base font-bold text-white mb-4">Post a custom task to our Developer Escrow Marketplace</h3>
                  <form onSubmit={handlePostJob} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Project or Task Title</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g., AuraNFT Base Audits & Deployment"
                          value={newJobTitle}
                          onChange={(e) => setNewJobTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Escrow Budget ($ USD)</label>
                        <input 
                          type="number" 
                          placeholder="e.g., 1500"
                          value={newJobBudget}
                          onChange={(e) => setNewJobBudget(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Detailed Technical Specifications</label>
                      <textarea 
                        rows={3}
                        value={newJobDesc}
                        onChange={(e) => setNewJobDesc(e.target.value)}
                        placeholder="Detail which parts of the AI generated schemas or components they need to enhance."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-violet-500"
                      ></textarea>
                    </div>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 text-white font-bold text-xs rounded-lg transition active:scale-95"
                    >
                      Publish to Marketplace
                    </button>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* DEVELOPER FILTER AND LIST */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1.5 self-start">
                      <button 
                        onClick={() => setDevFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs transition ${devFilter === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                      >
                        All Experts
                      </button>
                      <button 
                        onClick={() => setDevFilter('freelancer')}
                        className={`px-3 py-1.5 rounded-lg text-xs transition ${devFilter === 'freelancer' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                      >
                        Freelancers
                      </button>
                      <button 
                        onClick={() => setDevFilter('dev_house')}
                        className={`px-3 py-1.5 rounded-lg text-xs transition ${devFilter === 'dev_house' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                      >
                        Dev Houses
                      </button>
                    </div>

                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Filter skills..."
                        value={devSearch}
                        onChange={(e) => setDevSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {filteredDevs.map(dev => (
                      <div key={dev.id} className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl relative group hover:border-slate-700 transition">
                        {dev.verified && (
                          <span className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                            Verified Partner
                          </span>
                        )}

                        <div className="flex items-start gap-4">
                          <img 
                            src={dev.avatar} 
                            alt={dev.name} 
                            className="w-12 h-12 rounded-xl object-cover border border-slate-800"
                          />
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white group-hover:text-violet-400 transition flex items-center gap-1.5">
                              {dev.name}
                              <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">{dev.type}</span>
                            </h3>
                            <p className="text-xs text-slate-400">{dev.title}</p>
                            
                            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 pt-2">
                              <span className="flex items-center gap-1 text-amber-400">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                {dev.rating.toFixed(1)}
                              </span>
                              <span>•</span>
                              <span>{dev.completedJobs} projects completed</span>
                              <span>•</span>
                              <span className="text-white hover:underline cursor-pointer flex items-center gap-0.5">
                                <ExternalLink className="w-2.5 h-2.5" /> github
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-3">
                              {dev.skills.map((skill, si) => (
                                <span key={si} className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80 text-slate-300">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                          <p className="text-xs text-slate-500">
                            Hourly Rate: <span className="font-mono text-white font-bold">${dev.hourlyRate}/hr</span>
                          </p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setCurrentMode('dashboard');
                                setDashTab('marketplace');
                              }}
                              className="px-3 py-1.5 bg-violet-600/10 hover:bg-violet-600/30 text-violet-400 border border-violet-500/20 rounded-md text-xs font-semibold transition"
                            >
                              Message Developer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CURRENT OPEN MARKETPLACE JOBS */}
                <div>
                  <div className="p-5 bg-[#0F1424] border border-slate-800 rounded-xl space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Escrow Contracts</h4>
                      <span className="text-[10px] font-mono bg-violet-900/30 text-violet-400 px-2 py-0.5 rounded">{marketplaceJobs.length} Active</span>
                    </div>

                    <div className="space-y-3">
                      {marketplaceJobs.map(job => {
                        const percent = getJobProgressPercent(job);
                        return (
                          <div key={job.id} className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg relative overflow-hidden space-y-2">
                            <div className="flex justify-between items-start">
                              <p className="text-xs font-bold text-white mb-1 line-clamp-1 flex-1">{job.projectTitle}</p>
                              <span className="text-emerald-400 font-semibold text-[10px] font-mono leading-none">${job.budget} USD</span>
                            </div>
                            
                            {/* COMPACT PROGRESS BAR */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] text-slate-400">
                                <span>Project Phase</span>
                                <span className="font-mono text-cyan-400 font-semibold">
                                  {percent}% Complete
                                </span>
                              </div>
                              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-violet-600 via-violet-400 to-cyan-400 rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1">
                              {job.assignedDev ? (
                                <span className="text-[9px]">
                                  Partner: <span className="text-slate-300 font-medium">{job.assignedDev}</span>
                                </span>
                              ) : (
                                <span className="text-[9px] text-amber-500/85">Seeking Dev...</span>
                              )}
                              <span className={`uppercase font-bold text-[8px] px-1.5 py-0.5 rounded ${
                                job.status === 'open' ? 'bg-blue-950/80 text-blue-400 border border-blue-900/30' : 
                                job.status === 'assigned' ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-900/30' :
                                job.status === 'escrow' ? 'bg-purple-950/80 text-purple-400 border border-purple-900/30' :
                                'bg-emerald-950/80 text-emerald-400 border border-emerald-900/35'
                              }`}>
                                {job.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed text-center">
                      Funds are stored securely inside Devibe Smart escrow containers. Verified software delivery triggers payout.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LANDING TAB: DOCS */}
          {landingTab === 'docs' && (
            <div className="max-w-6xl mx-auto px-4 py-12">
              <div className="text-center mb-10">
                <h1 className="font-display text-3xl font-extrabold text-white mb-2">Devibe Architecture Documentation</h1>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">Explore technical guidelines for implementing Model Context Protocol rules, deploying API sandboxes, and bridging freelancer handovers.</p>
                
                {/* Search Docs input */}
                <div className="max-w-xs mx-auto mt-4">
                  <input 
                    type="text" 
                    placeholder="Search docs..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sidebar index */}
                <div className="space-y-6">
                  {DOC_SECTIONS.map((sec, si) => (
                    <div key={si} className="space-y-2">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 px-3">{sec.title}</h3>
                      <div className="flex flex-col gap-1">
                        {sec.items.map(item => (
                          <button 
                            key={item.id}
                            onClick={() => setActiveDocId(item.id)}
                            className={`w-full text-left text-xs px-3 py-2 rounded-lg transition ${activeDocId === item.id ? 'bg-violet-900/30 text-violet-400 font-medium border-l-2 border-violet-500' : 'text-slate-300 hover:bg-slate-800/55'}`}
                          >
                            {item.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main doc display */}
                <div className="md:col-span-2">
                  {(() => {
                    const foundItem = DOC_SECTIONS.flatMap(s => s.items).find(i => i.id === activeDocId);
                    if (!foundItem) return <p className="text-xs text-slate-500">Select a section to read.</p>;
                    return (
                      <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl min-h-[300px]">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-violet-400" />
                          {foundItem.title}
                        </h2>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{foundItem.content}</p>
                        
                        <div className="mt-8 pt-6 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Updated: 2026-05-28 UTC</span>
                          <span className="text-brand-blue flex items-center gap-1 cursor-pointer" onClick={() => setDashTab('builder')}>
                            Launch Editor <Sparkles className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* LANDING TAB: BLOG */}
          {landingTab === 'blog' && (
            <div className="max-w-5xl mx-auto px-4 py-12">
              <div className="text-center mb-10">
                <h1 className="font-display text-3xl font-extrabold text-white mb-2">Devibe Engineering Insights</h1>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">Read deep dives written by core platform contributors on the design space of LLMs, agentic developer setups, and multi-agent code orchestration.</p>
              </div>

              <div className="space-y-6">
                {BLOG_POSTS.map(post => (
                  <div key={post.id} className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-violet-400" />
                        {post.readTime}
                      </span>
                      <span>•</span>
                      <span>{post.date}</span>
                    </div>

                    <h2 className="text-base font-bold text-white mb-2 hover:text-violet-400 transition cursor-pointer">{post.title}</h2>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">{post.preview}</p>
                    
                    <button onClick={() => setLandingTab('docs')} className="text-xs text-brand-blue hover:underline font-mono inline-flex items-center gap-1">
                      Read technical notes <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LANDING TAB: PRICING */}
          {landingTab === 'pricing' && (
            <div className="max-w-6xl mx-auto px-4 py-12">
              <div className="text-center mb-8">
                <h1 className="font-display text-3xl font-extrabold text-white mb-2">Simple, Fair Scaling Tiers</h1>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">Subscribe with a card via Stripe, or pay with USDC on Base. Crypto pays activate instantly once the on-chain transfer lands.</p>
              </div>

              {/* Live subscribe controls — Stripe + crypto */}
              <Suspense
                fallback={
                  <div className="h-40 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse mb-10" />
                }
              >
                <div className="mb-12">
                  <BillingPanel
                    userId={user?.uid || privyIdentity?.id || null}
                    isPrivyConfigured={isPrivyConfigured()}
                  />
                </div>
              </Suspense>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* FREE */}
                <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl relative flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-300">Free Tier</h3>
                    <p className="text-2xl font-extrabold text-white my-3">$0</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">Perfect for quick client experiments and exploratory product scaffolding ideas.</p>
                    
                    <ul className="space-y-2 mt-4 text-[11px] text-slate-400">
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-blue" /> 3 AI Blueprint designs/mo</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-blue" /> Relational SQL table outputs</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-blue" /> Copy full component codes</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setCurrentMode('dashboard'); setDashTab('builder'); }}
                    className="w-full mt-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition"
                  >
                    Start scaffolding
                  </button>
                </div>

                {/* BUILDER */}
                <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl relative flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-300">Builder</h3>
                    <p className="text-2xl font-extrabold text-white my-3">$29<span className="text-xs text-slate-500">/mo</span></p>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">Designed for active solo founders wanting to prototype comprehensive SaaS utilities daily.</p>
                    
                    <ul className="space-y-2 mt-4 text-[11px] text-slate-400">
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-blue" /> 50 AI generations/mo</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-blue" /> Access specialized agent check tasks</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-blue" /> Standard Escrow Posting</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setCurrentMode('dashboard'); setDashTab('builder'); }}
                    className="w-full mt-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition"
                  >
                    Choose Builder
                  </button>
                </div>

                {/* PRO */}
                <div className="p-6 bg-[#0E1322] border-2 border-violet-500 rounded-xl relative flex flex-col justify-between shadow-xl shadow-violet-950/20">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white font-mono text-[9px] px-3 py-1 rounded-full uppercase font-bold tracking-widest">Most Popular</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-300">Pro</h3>
                    <p className="text-2xl font-extrabold text-white my-3">$79<span className="text-xs text-slate-500">/mo</span></p>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">Engineered for agile agencies wanting custom code scaffolding and client transfers.</p>
                    
                    <ul className="space-y-2 mt-4 text-[11px] text-slate-400">
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-violet-400" /> Unlimited AI Generations</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-violet-400" /> Custom model schema options</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-violet-400" /> Priority developer escrow support</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setCurrentMode('dashboard'); setDashTab('builder'); }}
                    className="w-full mt-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-semibold transition"
                  >
                    Choose Pro
                  </button>
                </div>

                {/* BUSINESS */}
                <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl relative flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-300">Business / Org</h3>
                    <p className="text-2xl font-extrabold text-white my-3">$249<span className="text-xs text-slate-500">/mo</span></p>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">Complete white-labeled interfaces, smart team workflows, and custom git synchronizers.</p>
                    
                    <ul className="space-y-2 mt-4 text-[11px] text-slate-400">
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-blue" /> Multi-seat administrative panel</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-blue" /> Private agent credentials integration</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-blue" /> Direct dev house milestone matching</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setCurrentMode('dashboard'); setDashTab('builder'); }}
                    className="w-full mt-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition"
                  >
                    Contact Sales
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* LANDING FOOTER */}
          <footer className="mt-16 pt-12 border-t border-slate-800/80 max-w-7xl mx-auto px-4 text-center sm:text-left">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
              <div className="space-y-2">
                <DevibeLogo size={32} />
                <p className="text-xs text-slate-500 mt-1">An elegant, multi-agent developer system bridging non-technical founders to verified development teams with ease.</p>
              </div>
              <div>
                <h4 className="text-xs font-mono font-bold uppercase text-slate-400 mb-2">Systems</h4>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li className="hover:text-white cursor-pointer" onClick={() => setLandingTab('features')}>AI Builder</li>
                  <li className="hover:text-white cursor-pointer" onClick={() => setLandingTab('features')}>MCP Orchestrator</li>
                  <li className="hover:text-white cursor-pointer" onClick={() => setLandingTab('marketplace')}>Talent Match</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-mono font-bold uppercase text-slate-400 mb-2">Documentation</h4>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li className="hover:text-white cursor-pointer" onClick={() => setLandingTab('docs')}>JSON-RPC APIs</li>
                  <li className="hover:text-white cursor-pointer" onClick={() => setLandingTab('docs')}>Escrow Rules</li>
                  <li className="hover:text-white cursor-pointer" onClick={() => setLandingTab('docs')}>CLI Scaffolder</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-mono font-bold uppercase text-slate-400 mb-2">Legal</h4>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li className="hover:text-white cursor-pointer">Terms of Service</li>
                  <li className="hover:text-white cursor-pointer">Privacy Statement</li>
                  <li className="hover:text-white cursor-pointer">Stripe Escrow Rules</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-900 mt-8 pt-6 pb-2 flex flex-col sm:flex-row justify-between text-[11px] text-slate-600 font-mono">
              <span>© 2026 Devibe, Inc. All rights reserved.</span>
              <span>Coordinates: AI_STUDIO_BUILD_3000</span>
            </div>
          </footer>
        </main>
      )}

      {/* ————————————————— MAIN DASHBOARD APPLICATION ————————————————— */}
      {currentMode === 'dashboard' && (
        <div id="developer-os-workspace" className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* DASHBOARD LEFT COLUMN: SIDEBAR CONTROLLER */}
          <div className="space-y-5">
            <div className="p-4 bg-[#0F1424] border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800">
                <LayoutGrid className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation Hub</span>
              </div>

              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => setDashTab('home')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs leading-none transition duration-150 flex items-center justify-between ${dashTab === 'home' ? 'bg-violet-900/30 text-violet-400 font-medium' : 'text-slate-300 hover:bg-slate-800/50'}`}
                >
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    <span>Control Panel Home</span>
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded font-mono">Main</span>
                </button>

                <button 
                  onClick={() => setDashTab('builder')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs leading-none transition duration-150 flex items-center justify-between ${dashTab === 'builder' ? 'bg-violet-900/30 text-violet-400 font-medium' : 'text-slate-300 hover:bg-slate-800/50'}`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>AI Product Builder</span>
                  </span>
                  <span className="text-[9px] bg-cyan-900/40 text-cyan-400 px-1.5 py-0.5 rounded font-mono uppercase font-bold animate-pulse">Live</span>
                </button>

                <button 
                  onClick={() => setDashTab('projects')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs leading-none transition duration-150 flex items-center justify-between ${dashTab === 'projects' ? 'bg-violet-900/30 text-violet-400 font-medium' : 'text-slate-300 hover:bg-slate-800/50'}`}
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>Projects & Blueprint Files</span>
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded font-mono">{projects.length}</span>
                </button>

                <button 
                  onClick={() => setDashTab('marketplace')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs leading-none transition duration-150 flex items-center justify-between ${dashTab === 'marketplace' ? 'bg-violet-900/30 text-violet-400 font-medium' : 'text-slate-300 hover:bg-slate-800/50'}`}
                >
                  <span className="flex items-center gap-2">
                    <Users2 className="w-4 h-4" />
                    <span>Marketplace Audits</span>
                  </span>
                  <span className="text-[10px] bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded font-mono">Talent</span>
                </button>

                <button 
                  onClick={() => setDashTab('docs')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs leading-none transition duration-150 flex items-center justify-between ${dashTab === 'docs' ? 'bg-violet-900/30 text-violet-400 font-medium' : 'text-slate-300 hover:bg-slate-800/50'}`}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>MCP JSON-RPC Docs</span>
                  </span>
                </button>

                <button 
                  onClick={() => setDashTab('settings')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs leading-none transition duration-150 flex items-center justify-between ${dashTab === 'settings' ? 'bg-violet-900/30 text-violet-400 font-medium' : 'text-slate-300 hover:bg-slate-800/50'}`}
                >
                  <span className="flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    <span>General Settings</span>
                  </span>
                </button>
              </div>
            </div>

            {/* MCP SERVER INSTANCES OR STATUS BLOCK */}
            <div className="p-4 bg-slate-900/50 border border-slate-850 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Agent Network Cluster</span>
                <span className="w-2- h-2 rounded-full bg-emerald-500 w-2 h-2 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-slate-400">8 specialized MCP subroutines active with memory stores.</p>
              
              <div className="space-y-1.5 text-[10px] font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Product Planning Agent</span>
                  <span className="text-emerald-400">IDLE</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Design CSS Token Sync</span>
                  <span className="text-emerald-400">IDLE</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Backend Schema DDL Audit</span>
                  <span className="text-emerald-400 font-medium">ONLINE</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Mobile React Native Compiler</span>
                  <span className="text-slate-500">OFFLINE</span>
                </div>
              </div>
            </div>
          </div>

          {/* DASHBOARD RIGHT SHIELD: SUB PAGES RENDERS */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 1. DASHBOARD OVERVIEW HOME TAB */}
            {dashTab === 'home' && (
              <div className="space-y-6">
                
                {/* BRAND INTRO JUMBOTRON & AUTH CALLOUT */}
                <div className="p-6 bg-gradient-to-r from-[#171330] via-[#0E1529] to-[#0A0D1A] border border-violet-500/20 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <Sparkles className="w-16 h-16 text-violet-500/10" />
                  </div>
                  
                  {user ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt="Avatar" 
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-full border-2 border-violet-500 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-500 flex items-center justify-center font-bold text-white uppercase text-sm border border-violet-500/30">
                          {user.displayName?.slice(0, 2) || "U"}
                        </div>
                      )}
                      <div>
                        <h1 className="font-display text-xl sm:text-2xl font-black text-white">
                          Welcome back, {user.displayName || 'Authorized Founder'}!
                        </h1>
                        <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                          <span>Firebase Secure Workspace Session: </span>
                          <span className="text-cyan-400 font-medium">{user.email}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h1 className="font-display text-xl sm:text-2xl font-black text-white mb-2">
                        Welcome to your Vibe Coding Control Center
                      </h1>
                      <p className="text-xs text-slate-300 max-w-xl leading-relaxed mb-4">
                        This unified operations deck bridges your raw prompts to production database blueprints, complete UI screens, tasks checkpoints, and developer escrow matching.
                      </p>
                    </div>
                  )}

                  {!user && (
                    <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 shadow-inner">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200">Personalize Your Workspace</p>
                        <p className="text-[10px] text-slate-400">Log in with Google to persist blueprints, track escrow verification logs and authorize workspace commits.</p>
                      </div>
                      <button 
                        onClick={loginWithGoogle}
                        className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-bold text-white rounded-lg transition flex items-center gap-2 shadow shrink-0 cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Link Google Auth</span>
                      </button>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button 
                      onClick={() => setDashTab('builder')}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 text-white font-semibold text-xs rounded-lg transition active:scale-95 flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Launch AI Builder Engine</span>
                    </button>
                    <button 
                      onClick={() => setDashTab('projects')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 text-xs rounded-lg transition"
                    >
                      Browse Active Blueprints ({projects.length})
                    </button>
                  </div>
                </div>

                {/* STATS MATRIX */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Registered Blueprints</p>
                    <p className="text-2xl font-extrabold text-white font-mono mt-1">{projects.length}</p>
                    <span className="text-[10px] text-slate-500 block">Saved in local browser matrix</span>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Coordinated MCP Agents</p>
                    <p className="text-2xl font-extrabold text-brand-blue font-mono mt-1">8 Active</p>
                    <span className="text-[10px] text-slate-500 block">Synthesized sandbox processes</span>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Stripe-Backed Escrow Jobs</p>
                    <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{marketplaceJobs.length}</p>
                    <span className="text-[10px] text-slate-500 block">Verified security balance</span>
                  </div>
                </div>

                {/* PINNED BLUEPRINTS FILES LIST */}
                <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Starred Application Schematics</h3>
                    <button onClick={() => setDashTab('projects')} className="text-[11px] text-violet-400 hover:underline">View All</button>
                  </div>

                  <div className="space-y-3">
                    {projects.map(proj => (
                      <div 
                        key={proj.id}
                        className="p-4 bg-slate-950/40 border border-slate-850 hover:border-slate-700 transition rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer"
                        onClick={() => {
                          setSelectedProject(proj);
                          setDashTab('projects');
                        }}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white uppercase tracking-tight">{proj.name}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${proj.status === 'deployed' ? 'bg-emerald-950 text-emerald-300' : 'bg-violet-950 text-violet-300'}`}>
                              {proj.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{proj.description}</p>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                          <span>STACK: {proj.stack}</span>
                          <span className="text-violet-400 font-bold">Inspect Blueprint ➔</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ESCROW JOB DISPATCH DIRECTORY */}
                <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">Contract Jobs Directory</h3>
                    <span className="text-[11px] text-slate-400">Stripe Escrow Verified</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {marketplaceJobs.map(job => {
                      const percent = getJobProgressPercent(job);
                      return (
                        <div key={job.id} className="p-4 bg-slate-955/60 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <span className="text-xs font-bold text-white line-clamp-1">{job.projectTitle}</span>
                              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded shrink-0">${job.budget}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1">Milestones verified on GitHub commits before dispatch.</p>
                          </div>

                          {/* PROGRESS GRAPHIC */}
                          <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-md border border-slate-800/50">
                            <div className="flex justify-between text-[9px]">
                              <span className="text-slate-400">Escrow Progress</span>
                              <span className="text-cyan-400 font-mono font-semibold">{percent}% COMPLETE</span>
                            </div>
                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-violet-600 to-cyan-400 rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
                            <span className="text-[9px] font-mono text-slate-500">
                              STATUS: <span className="text-violet-400 font-bold">{job.status.toUpperCase()}</span>
                            </span>
                            <button 
                              onClick={() => setDashTab('marketplace')} 
                              className="text-[10px] text-violet-400 hover:text-violet-350 hover:underline font-bold transition flex items-center gap-1"
                            >
                              Track Status ➔
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* 2. DYNAMIC AI PROMPT GENERATOR PAGE */}
            {dashTab === 'builder' && (
              <div className="space-y-6">
                
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl relative">
                  <div className="absolute top-4 right-4 text-xs font-mono text-slate-500">
                    SERVICE: /api/builder/generate
                  </div>
                  
                  <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
                    Interactive Prompt-to-App Generator
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">
                    Devibe's coordinated AI systems map your natural language text into beautiful functional schematics. Enter precise requirements (e.g., database tables, state interactions, themes).
                  </p>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Describe the application you want to build:</label>
                    <div className="relative">
                      <textarea 
                        rows={4}
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        placeholder="e.g., A subscription e-commerce site for coffee pods with custom checkout routes and robust order tracking tables..."
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition focus:ring-1 focus:ring-violet-500"
                      ></textarea>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4">
                    <div className="text-[10px] text-slate-500 text-left w-full sm:w-auto">
                      ⚡ Coordinated Gemini engine returns PRDs, relational SQL commands, and React Tailwind setups.
                    </div>
                    <button 
                      onClick={triggerProductionGeneration}
                      disabled={isGenerating || !promptInput.trim()}
                      className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs text-white uppercase tracking-wider flex items-center justify-center gap-2 transition ${isGenerating || !promptInput.trim() ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 shadow-lg shadow-violet-900/30'}`}
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCcw className="w-4 h-4 animate-spin text-cyan-300" />
                          <span>Generating App Matrix...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-cyan-300" />
                          <span>Build Product Assets</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* GENERATION OR ORCHESTRATION LOGS */}
                {isGenerating && (
                  <div className="p-4 bg-slate-950 border border-cyan-500/10 rounded-xl font-mono text-xs text-slate-300 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-cyan-400 uppercase tracking-widest border-b border-slate-900 pb-2 mb-2">
                      <span>Coordinating Agent subroutines:</span>
                      <span className="animate-pulse">Active Orchestration Block</span>
                    </div>
                    <div className="space-y-1.5 overflow-y-auto max-h-[160px]">
                      {generationLogs.map((log, li) => (
                        <p key={li} className="text-[11px] leading-relaxed">
                          <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span> {log}
                        </p>
                      ))}
                      <div className="flex items-center gap-1 text-[11px] text-cyan-400 animate-pulse pt-1">
                        <span>● Agent process writing code segments... please wait</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SHOW GENERATED BLUEPRINT ACCORDION */}
                {generatedApp && !isGenerating && (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#0F1424] border border-violet-500/20 rounded-2xl">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800 mb-4">
                        <div>
                          <p className="text-[10px] font-mono text-violet-400 uppercase tracking-wider">Dynamic App Output Block</p>
                          <h3 className="text-lg font-bold text-white mt-1">🚀 Built Blueprints: {generatedApp.appName}</h3>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-xs font-mono font-bold">
                          100% COMPLETE Blueprints Generated
                        </span>
                      </div>

                      {/* Tab Switchers */}
                      <div className="flex items-center gap-1 border-b border-slate-800 mb-4 overflow-x-auto pb-1">
                        <button
                          onClick={() => setActiveGenTab('ide')}
                          className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1.5 ${activeGenTab === 'ide' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>IDE</span>
                        </button>
                        <button
                          onClick={() => setActiveGenTab('live_preview')}
                          className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1.5 ${activeGenTab === 'live_preview' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <Play className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                          <span>Interactive Preview</span>
                        </button>
                        <button 
                          onClick={() => setActiveGenTab('preview')}
                          className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1.5 ${activeGenTab === 'preview' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>Generated Frontend Code</span>
                        </button>
                        <button 
                          onClick={() => setActiveGenTab('prd')}
                          className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1.5 ${activeGenTab === 'prd' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Strategic PRD Requirements</span>
                        </button>
                        <button 
                          onClick={() => setActiveGenTab('db')}
                          className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1.5 ${activeGenTab === 'db' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>Database Relational schema</span>
                        </button>
                        <button 
                          onClick={() => setActiveGenTab('tasks')}
                          className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1.5 ${activeGenTab === 'tasks' ? 'bg-violet-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Checklist Tasks ({generatedApp.tasks?.length || 0})</span>
                        </button>
                      </div>

                      {/* TAB 0: LIVE INTERACTIVE PREVIEW & DESIGN REFLECTION GRID */}
                      {activeGenTab === 'ide' && (
                        <Suspense
                          fallback={
                            <div className="h-[640px] flex items-center justify-center text-xs text-slate-400 bg-slate-900/40 border border-slate-800 rounded-xl">
                              <span className="inline-flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full border-2 border-slate-700 border-t-violet-500 animate-spin" />
                                Loading IDE…
                              </span>
                            </div>
                          }
                        >
                          <IDEPanel
                            initialCode={generatedApp.codeSnippets?.[0]?.code || '// Generated code will appear here.'}
                            filename={generatedApp.codeSnippets?.[0]?.filename || (ideTemplate === 'expo' ? 'App.tsx (Expo)' : 'App.tsx')}
                            chat={chatPayload}
                            chatInput={refineInput}
                            onChatInputChange={setRefineInput}
                            onSubmitChat={() => executeRefineRequest()}
                            isWorking={isRefining || isGenerating}
                            onSaveSnapshot={saveIDESnapshot}
                            onExportToGitHub={
                              githubToken && selectedProject?.githubRepo ? exportIDECodeToGitHub : null
                            }
                            exportLabel={
                              !githubToken
                                ? 'Connect GitHub first'
                                : !selectedProject?.githubRepo
                                  ? 'Open a project with a linked repo to export'
                                  : undefined
                            }
                            isExporting={isExportingFromIDE}
                            template={ideTemplate}
                            onTemplateChange={setIdeTemplate}
                          />
                        </Suspense>
                      )}

                      {activeGenTab === 'live_preview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                          {/* PREVIEW CONTAINER - COLS 1 to 8 */}
                          <div className="lg:col-span-8 space-y-4">
                            
                            {/* PREVIEW TOP PANEL CONTROLS */}
                            <div className="flex items-center justify-between p-3.5 bg-slate-950/80 border border-slate-800/85 rounded-xl">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Device View Simulator</span>
                              </div>
                              
                              <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
                                <button 
                                  onClick={() => setPreviewDevice('desktop')}
                                  className={`px-3 py-1 text-[10px] font-mono rounded flex items-center gap-1.5 transition ${previewDevice === 'desktop' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                  <Monitor className="w-3.5 h-3.5" />
                                  <span>Desktop View</span>
                                </button>
                                <button 
                                  onClick={() => setPreviewDevice('mobile')}
                                  className={`px-3 py-1 text-[10px] font-mono rounded flex items-center gap-1.5 transition ${previewDevice === 'mobile' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                  <Smartphone className="w-3.5 h-3.5" />
                                  <span>Mobile Preview</span>
                                </button>
                              </div>
                            </div>

                            {/* PREVIEW CANVAS CONTAINER */}
                            <div className="p-6 bg-[#090D1A] border border-slate-850 rounded-2xl flex items-center justify-center min-h-[580px] relative overflow-hidden">
                              
                              {/* 1. DESKTOP VIEWPORT */}
                              {previewDevice === 'desktop' && (
                                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl text-slate-150 flex flex-col h-[540px]">
                                  {/* Browser Header address bar mockup */}
                                  <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                                    </div>
                                    <div className="bg-slate-900/80 border border-slate-850 rounded px-6 py-0.5 text-[10px] text-slate-400 font-mono w-1/2 text-center truncate">
                                      https://demo.devibe.sandbox/{generatedApp.appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}
                                    </div>
                                    <span className="text-[10px] font-mono text-[#00D4FF] bg-[#00D4FF]/5 px-2 py-0.5 border border-[#00D4FF]/10 rounded">PORT: 3000</span>
                                  </div>

                                  {/* Dynamic Dashboard inner */}
                                  <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
                                    <div className="flex justify-between items-start pb-3 border-b border-slate-800">
                                      <div>
                                        <h4 className="text-white text-base font-bold flex items-center gap-1.5">
                                          <Sparkles className="w-4 h-4 text-[#00D4FF] animate-bounce" />
                                          {generatedApp.appName}
                                        </h4>
                                        <p className="text-[10px] text-slate-455 mt-1">{generatedApp.description}</p>
                                      </div>
                                      <span className="px-2.5 py-1 bg-[#6E3CFB]/10 text-[#a380ff] border border-[#6E3CFB]/20 rounded-full font-mono text-[9px] uppercase tracking-wider">
                                        Active Prototype sandbox
                                      </span>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded-lg flex flex-col justify-between hover:border-violet-500/40 transition">
                                        <div className="flex justify-between text-slate-400 text-[10px] font-mono">
                                          <span>PROCESSED RECORDS</span>
                                          <Database className="w-3.5 h-3.5 text-violet-400" />
                                        </div>
                                        <p className="text-lg font-bold text-white font-mono mt-1.5">{simDataCount}</p>
                                        <span className="text-[9px] text-[#00D4FF]/80 mt-1 font-mono">Live dynamic variables</span>
                                      </div>
                                      
                                      <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded-lg flex flex-col justify-between hover:border-blue-500/40 transition">
                                        <div className="flex justify-between text-slate-400 text-[10px] font-mono">
                                          <span>ACTIVE TO-DOS</span>
                                          <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                                        </div>
                                        <p className="text-lg font-bold text-white font-mono mt-1.5">
                                          {Object.keys(simCheckedFeatures).filter(k => simCheckedFeatures[k]).length} / {generatedApp.prd?.features?.length || 0} Finished
                                        </p>
                                        <span className="text-[9px] text-emerald-400 mt-1 font-mono">✓ Interactive toggle checks</span>
                                      </div>

                                      <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded-lg flex flex-col justify-between hover:border-emerald-500/40 transition">
                                        <div className="flex justify-between text-slate-400 text-[10px] font-mono">
                                          <span>COMPILER HOSTING</span>
                                          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                                        </div>
                                        <p className="text-lg font-bold text-emerald-400 font-mono mt-1.5">STABLE</p>
                                        <span className="text-[9px] text-slate-500 mt-1 font-mono">Endpoint: /api/sandbox</span>
                                      </div>
                                    </div>

                                    {/* Interactive sandbox triggers */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-xl space-y-2.5">
                                        <p className="font-bold text-white text-[11px] uppercase tracking-wider font-mono text-violet-400">Sandbox Controller Panel</p>
                                        <p className="text-[10px] text-slate-400">Interact with the real-time client simulator and push events directly through the simulated network pipelines.</p>
                                        
                                        <div className="flex flex-wrap gap-2 pt-1">
                                          <button 
                                            onClick={() => {
                                              setSimDataCount(prev => prev + 1);
                                              setSimLogs(prev => [`[Action Event] Ingested simulated telemetry row into PostgreSQL`, ...prev]);
                                            }}
                                            className="px-3 py-1.5 bg-[#6E3CFB] hover:bg-[#6E3CFB]/90 active:scale-95 transition text-[10px] font-mono text-white rounded font-bold"
                                          >
                                            + Post Mock Row Event
                                          </button>
                                          
                                          <button 
                                            onClick={() => {
                                              setSimLogs(prev => [
                                                `[RPC Diagnostics] Validated response timings for ${generatedApp.appName}`,
                                                `[DB Status] Postgres connection pool healthy, 10 active connections`,
                                                `[Compiler] Sandbox assets output successfully optimized`,
                                                ...prev
                                              ]);
                                            }}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 active:scale-95 transition text-[10px] font-mono text-slate-300 rounded border border-slate-700 font-bold"
                                          >
                                            ⚡ Check System Endpoints
                                          </button>
                                        </div>
                                      </div>

                                      <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-xl flex flex-col h-[180px]">
                                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Sandbox Terminal Logs Output:</span>
                                        <div className="bg-[#0B0F19] border border-slate-900 rounded p-2 text-[10px] font-mono text-emerald-400 overflow-y-auto flex-1 space-y-1">
                                          {simLogs.map((log, logi) => (
                                            <p key={logi} className="leading-snug break-words">
                                              <span className="text-slate-600 font-semibold">{">"}</span> {log}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Features checklists */}
                                    <div className="p-4 bg-[#0B0F19] border border-slate-800/80 rounded-xl space-y-2">
                                      <span className="text-[10px] font-mono text-[#00D4FF] uppercase tracking-wider block">Integrated Feature Checklist Layers</span>
                                      <p className="text-[10px] text-slate-450">Select and toggle specific features configured in your requirements to verify simulated UI modules.</p>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                        {generatedApp.prd?.features?.map((feat, fIdx) => (
                                          <div 
                                            key={fIdx} 
                                            onClick={() => {
                                              const updated = { ...simCheckedFeatures };
                                              updated[feat.name] = !updated[feat.name];
                                              setSimCheckedFeatures(updated);
                                              setSimLogs(prev => [`[Layout Sync] Swapped interactive component: "${feat.name}" => ${updated[feat.name] ? 'ACTIVE' : 'INACTIVE'}`, ...prev]);
                                            }}
                                            className={`p-2 border.5 border rounded-xl flex items-center gap-2.5 cursor-pointer transition select-none ${simCheckedFeatures[feat.name] ? 'bg-emerald-950/15 border-emerald-500/35' : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'}`}
                                          >
                                            <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition ${simCheckedFeatures[feat.name] ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-700'}`}>
                                              {simCheckedFeatures[feat.name] && <Check className="w-2.5 h-2.5 stroke-[4px]" />}
                                            </div>
                                            <div className="truncate">
                                              <p className="text-[10px] text-white font-bold leading-tight truncate">{feat.name}</p>
                                              <span className="text-[8px] font-mono text-slate-500 uppercase">{feat.complexity} Complexity</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 2. REAL PHONE FRAME PREVIEW MOCKUP */}
                              {previewDevice === 'mobile' && (
                                <div className="relative">
                                  {/* The iPhone frame container */}
                                  <div className="w-[315px] h-[550px] rounded-[48px] border-[10px] border-slate-800 bg-[#0B0F19] relative shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-700/60 font-sans">
                                    
                                    {/* iPhone Camera Capsule (Dynamic Notch) */}
                                    <div className="w-24 h-4 bg-slate-900 border-b border-slate-950 absolute top-0 left-1/2 -translate-x-1/2 rounded-full z-40 flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#1e293b] mr-1.5"></div>
                                      <div className="w-12 h-0.5 bg-slate-800 rounded-full"></div>
                                    </div>

                                    {/* iPhone Status bar */}
                                    <div className="px-5 pt-1.5 pb-1 text-[8px] text-slate-400 font-mono font-medium flex justify-between bg-slate-950 relative z-30 select-none border-b border-slate-900/40">
                                      <span>11:54 AM</span>
                                      <div className="flex items-center gap-1">
                                        <span>📶</span>
                                        <span>82% 🔋</span>
                                      </div>
                                    </div>

                                    {/* Screen Body Viewport */}
                                    <div className="flex-1 bg-[#121829] overflow-y-auto px-4 py-4 space-y-4 text-[11px] select-none text-slate-200">
                                      
                                      {/* Header */}
                                      <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <div className="w-5 h-5 rounded bg-gradient-to-tr from-violet-600 to-[#00D4FF] flex items-center justify-center text-[9px] font-black text-white">D</div>
                                          <h5 className="font-bold text-white truncate text-[11px]">{generatedApp.appName}</h5>
                                        </div>
                                        <span className="text-[7px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded font-mono font-bold">LIVE:3000</span>
                                      </div>

                                      {/* Overview Description */}
                                      <div className="space-y-1">
                                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">App Overview:</span>
                                        <p className="text-[9px] text-slate-350 leading-relaxed bg-[#0B0F19] p-2 rounded-lg border border-slate-900">{generatedApp.description}</p>
                                      </div>

                                      {/* Live counter metrics row */}
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2.5 bg-[#0B0F19] border border-slate-850 rounded-xl">
                                          <span className="text-[8px] font-mono text-slate-500 uppercase block">Database Rows</span>
                                          <span className="text-sm font-bold text-white font-mono mt-0.5 block">{simDataCount}</span>
                                        </div>
                                        <div className="p-2.5 bg-[#0B0F19] border border-slate-850 rounded-xl">
                                          <span className="text-[8px] font-mono text-[#00D4FF] uppercase block">Design Code</span>
                                          <span className="text-[9px] text-[#00D4FF] font-medium leading-none mt-1 block truncate">Framer + Tailwind</span>
                                        </div>
                                      </div>

                                      {/* Mobile interact tools button */}
                                      <button 
                                        onClick={() => {
                                          setSimDataCount(prev => prev + 1);
                                          setSimLogs(prev => [`[Mobile Sync] Registries incremented from smartphone simulation click.`, ...prev]);
                                        }}
                                        className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-[9px] font-mono font-bold hover:opacity-95 text-center transition active:scale-95"
                                      >
                                        📲 Trigger Mock Client Event
                                      </button>

                                      {/* Features checklists scroll */}
                                      <div className="space-y-1.5">
                                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">Flipped Feature Blocks</span>
                                        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                                          {generatedApp.prd?.features?.map((f, fi) => (
                                            <div 
                                              key={fi} 
                                              onClick={() => {
                                                const updated = { ...simCheckedFeatures };
                                                updated[f.name] = !updated[f.name];
                                                setSimCheckedFeatures(updated);
                                                setSimLogs(prev => [`[Mobile Interface] Feature "${f.name}" checked => ${updated[f.name]}`, ...prev]);
                                              }}
                                              className={`p-1.5 rounded-lg border text-[9px] flex items-center justify-between cursor-pointer transition select-none ${simCheckedFeatures[f.name] ? 'bg-emerald-950/20 border-emerald-500/25' : 'bg-[#0B0F19]/60 border-slate-850'}`}
                                            >
                                              <span className="font-medium text-slate-300 truncate mr-2 text-[9px]">{f.name}</span>
                                              <div className={`w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center ${simCheckedFeatures[f.name] ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-700'}`}>
                                                {simCheckedFeatures[f.name] && <Check className="w-2 h-2 stroke-[4px]" />}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Dynamic DDL Preview block */}
                                      <div className="p-2 bg-[#0B0F19] border border-slate-850 rounded-lg space-y-1">
                                        <span className="text-[7px] font-mono text-violet-400 block tracking-widest uppercase">Postgre schema previews:</span>
                                        <pre className="text-[7px] font-mono text-slate-500 truncate leading-none">{generatedApp.databaseSchema}</pre>
                                      </div>

                                    </div>

                                    {/* iPhone Bottom sweeping indicator */}
                                    <div className="h-4.5 w-full bg-slate-950 relative z-30 select-none flex items-center justify-center">
                                      <div className="w-20 h-0.5 bg-slate-700 rounded-full"></div>
                                    </div>

                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* RIGHT COLUMN - COLS 9 to 12: CONTINUOUS AI COPILOT CHAT & INSTRUCTIONS HISTORIES */}
                          <div className="lg:col-span-4 space-y-4">
                            
                            {/* COPILOT HEADER */}
                            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-2">
                              <Brain className="w-5 h-5 text-[#00D4FF] animate-pulse shrink-0" />
                              <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider leading-none">Copilot Chat Assistant</h4>
                                <p className="text-[9px] text-slate-400 mt-1">Directly prompt edits and modifications, such as introducing custom authentication schemas.</p>
                              </div>
                            </div>

                            {/* SCROLLABLE LIVE CHAT CHANNELS */}
                            <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl h-[340px] flex flex-col justify-between">
                              <div className="overflow-y-auto space-y-3 flex-1 pr-1 max-h-[260px]">
                                {chatPayload.length === 0 ? (
                                  <div className="text-center py-12 text-slate-600 text-[10px] space-y-2">
                                    <MessageSquare className="w-8 h-8 mx-auto text-slate-850" />
                                    <p>No customized refinements logged yet.<br/>Type in your customization request below!</p>
                                  </div>
                                ) : (
                                  chatPayload.map((msg, mi) => (
                                    <div 
                                      key={mi} 
                                      className={`p-2.5 rounded-xl text-[10px] leading-relaxed max-w-[90%] ${msg.role === 'user' ? 'bg-violet-600/10 border border-violet-500/20 text-violet-200 ml-auto' : 'bg-[#0B0F19] border border-slate-850 text-slate-300 mr-auto'}`}
                                    >
                                      <span className="font-mono text-[8px] text-slate-500 mb-1 uppercase font-bold block">{msg.role === 'user' ? 'Founder instructions' : 'Co-developer Agent'}</span>
                                      <p className="text-[10px] whitespace-pre-line">{msg.text}</p>
                                    </div>
                                  ))
                                )}

                                {/* PROCESSING / REFINING BANNER */}
                                {isRefining && (
                                  <div className="p-3 bg-slate-900 border border-cyan-500/15 text-slate-300 rounded-xl space-y-2 font-mono text-[9px]">
                                    <div className="flex items-center gap-1.5 text-cyan-400">
                                      <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                                      <span className="font-bold">AI CUSTOMIZATION PIPELINE RUNNING...</span>
                                    </div>
                                    <div className="space-y-1">
                                      {generationLogs.slice(-2).map((log, li) => (
                                        <p key={li} className="text-slate-400 leading-tight">➔ {log}</p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* CHAT INPUT SUBMIT BAR */}
                              <form onSubmit={executeRefineRequest} className="mt-3 flex gap-2 border-t border-slate-900 pt-3">
                                <input 
                                  type="text"
                                  value={refineInput}
                                  onChange={(e) => setRefineInput(e.target.value)}
                                  disabled={isRefining || isGenerating}
                                  placeholder="e.g. Include search bar and user bio table..."
                                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
                                />
                                <button 
                                  type="submit"
                                  disabled={isRefining || isGenerating || !refineInput.trim()}
                                  className={`px-3 py-1.5 rounded-lg text-white shrink-0 flex items-center justify-center transition active:scale-95 ${isRefining || isGenerating || !refineInput.trim() ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500'}`}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </form>
                            </div>

                            {/* USEFUL REFINEMENT SUGGESTIONS QUICK PRESENTS */}
                            <div className="p-4 bg-[#0F1424]/40 border border-slate-800 rounded-lg space-y-2">
                              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Refinement Quick Presets:</span>
                              <div className="flex flex-wrap gap-1">
                                {[
                                  "Make details look styled in deep green",
                                  "Expand PostgreSQL user profiles schema",
                                  "Incorporate an admin stats metric component",
                                  "Attach test routing and validation checklists"
                                ].map((sug, sugI) => (
                                  <button
                                    key={sugI}
                                    type="button"
                                    onClick={() => setRefineInput(sug)}
                                    disabled={isRefining || isGenerating}
                                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-[9px] text-slate-400 rounded transition text-left"
                                  >
                                    + {sug}
                                  </button>
                                ))}
                              </div>
                            </div>

                          </div>

                        </div>
                      )}

                      {/* TAB 1: CODE PREVIEW */}
                      {activeGenTab === 'preview' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                            <div className="flex justify-between items-center text-xs text-slate-400 font-mono mb-2 border-b border-slate-900 pb-2">
                              <span>Source: {generatedApp.codeSnippets?.[0]?.filename || "LayoutDynamic.tsx"}</span>
                              <button 
                                onClick={() => copyToClipboard(generatedApp.codeSnippets?.[0]?.code || '', 'code')}
                                className="px-2.5 py-1 bg-slate-900/60 hover:bg-slate-850 text-[10px] text-white border border-slate-800 rounded flex items-center gap-1 transition"
                              >
                                {codeCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                {codeCopied ? 'Copied code!' : 'Copy Code'}
                              </button>
                            </div>
                            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre p-2 max-h-[380px] leading-relaxed">
                              {generatedApp.codeSnippets?.[0]?.code || '// Code component files generated successfully'}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* TAB 2: PRD */}
                      {activeGenTab === 'prd' && (
                        <div className="space-y-4 text-xs text-slate-300">
                          <p className="font-bold text-white text-sm">Product Requirements Overview</p>
                          <p className="leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-850">{generatedApp.prd?.overview}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                              <span className="text-[10px] font-mono text-violet-400">Target User Demographics:</span>
                              <p className="text-white font-medium text-[11px]">{generatedApp.prd?.targetAudience}</p>
                            </div>
                            <div className="p-4 bg-slate-955 border border-slate-850 bg-slate-950 rounded-xl space-y-2">
                              <span className="text-[10px] font-mono text-violet-400">Recommended Tech-Stack:</span>
                              <div className="text-[11px] space-y-1">
                                <p>• Frontend: <span className="text-white font-medium">{generatedApp.prd?.suggestedStack?.frontend}</span></p>
                                <p>• Backend: <span className="text-white font-medium">{generatedApp.prd?.suggestedStack?.backend}</span></p>
                                <p>• Database: <span className="text-white font-medium">{generatedApp.prd?.suggestedStack?.database}</span></p>
                                {generatedApp.prd?.suggestedStack?.blockchain && <p>• Blockchain: <span className="text-white font-medium">{generatedApp.prd?.suggestedStack.blockchain}</span></p>}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="font-bold text-white">Recommended Agile Feature Scopes:</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {generatedApp.prd?.features?.map((f, fi) => (
                                <div key={fi} className="p-3 bg-slate-950 border border-slate-850 rounded-lg">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-white">{f.name}</span>
                                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${f.complexity === 'High' ? 'bg-red-950 text-red-400' : f.complexity === 'Medium' ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'}`}>
                                      {f.complexity} Complexity
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400">{f.desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: SQL SCHEMA */}
                      {activeGenTab === 'db' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                            <div className="flex justify-between items-center text-xs text-slate-400 font-mono mb-2 border-b border-slate-900 pb-2">
                              <span>File: postgresql-ddl-schema.sql</span>
                              <button 
                                onClick={() => copyToClipboard(generatedApp.databaseSchema || '', 'sql')}
                                className="px-2.5 py-1 bg-slate-900/60 hover:bg-slate-850 text-[10px] text-white border border-slate-800 rounded flex items-center gap-1 transition"
                              >
                                {sqlCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                {sqlCopied ? 'Copied!' : 'Copy SQL Schema'}
                              </button>
                            </div>
                            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre p-2 max-h-[300px]">
                              {generatedApp.databaseSchema || '-- No SQL statements produced'}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* TAB 4: TASKS CHECKLISTS */}
                      {activeGenTab === 'tasks' && (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-400">The core orchestrator delegated these exact tasks configuration list across localized agents:</p>
                          <div className="space-y-2">
                            {generatedApp.tasks?.map((t) => (
                              <div key={t.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-white">{t.title}</p>
                                  <p className="text-[10px] text-slate-400">{t.description}</p>
                                  <span className="text-[9px] font-mono text-violet-400 uppercase">Assigned: {t.assigned_to}</span>
                                </div>
                                <span className={`text-[10px] px-2.5 py-1 rounded font-mono ${t.status === 'completed' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                  {t.status.toUpperCase()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* BOTTOM NEXT ACTION CALL TO ACTIONS */}
                      <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="text-xs text-slate-400">
                          Need custom integration of this generated blueprint?
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button 
                            onClick={() => {
                              // Assign to a new Escrow marketplace task
                              setNewJobTitle(`${generatedApp.appName} custom audit enhancement`);
                              setNewJobBudget('1500');
                              setLandingTab('marketplace');
                              setCurrentMode('landing');
                              setIsPostingJob(true);
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 text-white rounded text-xs font-bold transition active:scale-95"
                          >
                            Send Blueprint to Escrow Marketplace
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. PROJECTS & BLUEPRINTS WORKSPACE */}
            {dashTab === 'projects' && (
              <div className="space-y-6">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white uppercase tracking-wider font-display">Registered Blueprints Storage</h2>
                    <p className="text-xs text-slate-400">Review or launch dynamic custom codebases saved securely inside your browser local storage.</p>
                  </div>
                  
                  {/* CREATE MANUAL PROJECT CTA */}
                  <button 
                    onClick={() => handleAddNewProject("New Web Portal Mockup", "Custom business setup generated offline", "saas", "TypeScript, Next.js, Postgres")}
                    className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-semibold select-none flex items-center gap-1 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Blueprint Stub</span>
                  </button>
                </div>

                {/* DETAILED CARDS ACCORDION OR SELECT LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map(proj => (
                    <div 
                      key={proj.id}
                      className={`p-5 bg-slate-900 border rounded-2xl relative transition cursor-pointer flex flex-col justify-between h-52 ${selectedProject?.id === proj.id ? 'border-violet-500 bg-slate-900/90' : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'}`}
                      onClick={() => setSelectedProject(proj)}
                    >
                      <span className="absolute top-4 right-4 text-[9px] uppercase tracking-wider font-mono bg-slate-950 px-2 py-0.5 rounded text-slate-500">
                        {proj.type}
                      </span>

                      <div>
                        <span className="text-[10px] text-slate-500 font-mono block">{proj.createdAt}</span>
                        <h3 className="text-sm font-bold text-white mt-1 group-hover:text-violet-400 transition uppercase tracking-tight">{proj.name}</h3>
                        <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">{proj.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-850 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>STACK: {proj.stack}</span>
                        <span className="text-violet-400 font-bold">Inspect Details➔</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PROJECT WORKSPACE TAB DETAIL */}
                {selectedProject && (
                  <div className="p-6 bg-[#0E1322] border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500">Currently Inspected Blueprint Details:</span>
                        <h3 className="text-base font-bold text-white">{selectedProject.name}</h3>
                      </div>
                      <span className="px-2.5 py-1 bg-violet-950 text-violet-300 rounded text-xs font-mono">
                        STATUS: {selectedProject.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-850">
                      Description: {selectedProject.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-mono text-slate-500">Continuous Integration Checklist:</span>
                        <p className="text-slate-300">• Linter State Verification: <span className="text-emerald-400 font-semibold font-mono">PASS</span></p>
                        <p className="text-slate-300">• Webpack / Vite bundle size check: <span className="text-emerald-400 font-semibold font-mono">OK</span></p>
                        <p className="text-slate-300">• Target Port 3000 mapping: <span className="text-cyan-400 font-mono">YES</span></p>
                      </div>

                      <div className="p-4 bg-slate-955 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                        <span className="text-[10px] font-mono text-slate-500">Deploy Hook Options:</span>
                        <p className="text-slate-400 leading-relaxed text-[11px]">This config is linked local-only. Send to the Developer Marketplace to execute containerized deploy steps.</p>
                        <button 
                          onClick={() => {
                            setLandingTab('marketplace');
                            setCurrentMode('landing');
                            setIsPostingJob(true);
                            setNewJobTitle(`${selectedProject.name} custom integration deploy`);
                            setNewJobBudget('950');
                          }}
                          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-[11px] font-bold"
                        >
                          Find Integrator Partner
                        </button>
                      </div>
                    </div>

                    {/* GITHUB SYNC FEATURE CONTROL PANEL */}
                    <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-850 gap-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-indigo-400 fill-current" viewBox="0 0 16 16">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                          </svg>
                          <div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Devibe GitHub Sync & Pipeline Deploy</span>
                            <p className="text-[10px] text-slate-400">Connect a repository and enable automatic code pushes when the AI agent refines code.</p>
                          </div>
                        </div>

                        {!githubToken ? (
                          <button
                            onClick={handleConnectGitHub}
                            className={`px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-[11px] font-bold flex items-center gap-1.5 transition ${githubLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                            disabled={githubLoading}
                          >
                            <span>Connect GitHub Account</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {githubUser && (
                              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
                                <img src={githubUser.avatar_url} alt="" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
                                <span className="text-[10px] text-white font-mono">{githubUser.login}</span>
                              </div>
                            )}
                            <button
                              onClick={handleDisconnectGitHub}
                              className="px-2 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded text-[10px] font-medium transition"
                            >
                              Disconnect
                            </button>
                          </div>
                        )}
                      </div>

                      {githubError && (
                        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] rounded-lg font-mono">
                          Error: {githubError}
                        </div>
                      )}

                      {githubToken && (
                        <div className="space-y-4 pt-1">
                          {/* Choose or display connected repository */}
                          {!selectedProject.githubRepo ? (
                            <div className="space-y-2">
                              <span className="text-[10px] font-mono text-slate-500">Pick repository to connect to this Devibe project:</span>
                              {githubRepos.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">No repositories found. Create one on GitHub or refresh.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {githubRepos.slice(0, 6).map((repo) => (
                                    <button
                                      key={repo.id}
                                      onClick={() => handleLinkRepository(repo.full_name)}
                                      className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-violet-500/50 rounded-lg text-left transition space-y-1 block w-full"
                                    >
                                      <span className="text-xs font-semibold text-slate-200 block truncate">{repo.name}</span>
                                      <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1.5">
                                        {repo.private ? "🔒 Private" : "🌐 Public"} • {repo.full_name}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-mono text-violet-400 tracking-wider uppercase block">Linked Sync Repository:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white font-mono">{selectedProject.githubRepo}</span>
                                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-mono">
                                      ACTIVE SYNC
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400">AI refinements are automatically pushed as new commits.</p>
                                </div>

                                <div className="flex gap-2 w-full sm:w-auto">
                                  <button
                                    onClick={handleManualPushToGitHub}
                                    disabled={isPushingCode}
                                    className={`px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold transition flex items-center justify-center gap-1 w-full sm:w-auto ${isPushingCode ? 'opacity-60 cursor-not-allowed' : ''}`}
                                  >
                                    {isPushingCode ? "Pushing Tree..." : "Push Latest Code"}
                                  </button>
                                  <button
                                    onClick={handleUnlinkRepository}
                                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-850 rounded text-[11px] font-semibold transition"
                                  >
                                    Unlink Repo
                                  </button>
                                </div>
                              </div>

                              {activePushLogs.length > 0 && (
                                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[10px] space-y-1 text-slate-350">
                                  {activePushLogs.map((log, lIdx) => (
                                    <p key={lIdx} className={log.includes('[Success]') ? 'text-emerald-400' : log.includes('[Failed]') ? 'text-rose-400' : 'text-slate-300'}>
                                      {log}
                                    </p>
                                  ))}
                                </div>
                              )}

                              <div className="space-y-2">
                                <span className="text-[10px] font-mono text-slate-500 block">Repository Commit Actions Logs ({(selectedProject as any).githubPushes?.length || 0}):</span>
                                {!(selectedProject as any).githubPushes || (selectedProject as any).githubPushes.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic pl-1">No commits pushed yet. Trigger an AI refinement chat or click 'Push Latest Code' above to initiate!</p>
                                ) : (
                                  <div className="border border-slate-850 rounded-lg divide-y divide-slate-850 overflow-hidden bg-slate-900/40 select-none">
                                    {(selectedProject as any).githubPushes.map((push: any, index: number) => (
                                      <div key={index} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/80 transition">
                                        <div className="space-y-0.5 w-[70%]">
                                          <p className="text-slate-200 font-medium font-mono text-[10px] truncate">{push.commitMessage}</p>
                                          <span className="text-[9px] text-slate-500 block">Pushed on {new Date(push.timestamp).toLocaleString()}</span>
                                        </div>
                                        <span className="text-[9px] font-mono bg-violet-950 text-violet-300 px-2 py-0.5 rounded border border-violet-900/40">
                                          SHA: {push.commitSha}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* 4. DASHBOARD MARKETPLACE INTERFACE */}
            {dashTab === 'marketplace' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-white uppercase tracking-wider font-display">Talent & Milestones Auditing</h2>
                    <p className="text-xs text-slate-400">Initiate secure Stripe-Backed Escrow Jobs contracts directly mapped to your registered blueprints files.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setCurrentMode('landing');
                      setLandingTab('marketplace');
                      setIsPostingJob(true);
                    }}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded"
                  >
                    Post Job / Task Contract
                  </button>
                </div>

                <div className="space-y-4">
                  {marketplaceJobs.map(job => (
                    <div key={job.id} className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Active ESCROW contract</span>
                          <h3 className="text-sm font-bold text-white mt-1">{job.projectTitle}</h3>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold rounded">
                          ${job.budget} USD Secure
                        </span>
                      </div>

                      <p className="text-xs text-slate-350 leading-relaxed mt-2">
                        Escrow checks validates client signed-off logs and tests requirements before dispatching funds safely to the assigned developer.
                      </p>

                      {/* DETAILED INTERACTIVE PROGRESS TIMELINE */}
                      <div className="mt-5 p-4 bg-slate-950/85 border border-slate-800/80 rounded-xl space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Interactive Contract Pipeline</span>
                            <h4 className="text-xs font-bold text-slate-300">Target Milestones Checklist (Click steps to toggle completion)</h4>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-900 border border-slate-800 px-3 py-1 rounded-full shadow-inner">
                            <span className="text-slate-400 font-semibold text-[11px]">Milestones Track:</span>
                            <span className="text-cyan-400 font-bold">{getJobProgressPercent(job)}%</span>
                          </div>
                        </div>

                        {/* RULER TRACK PROGRESS BAR CONTAINER */}
                        <div className="relative">
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden relative border border-slate-800/50">
                            <div 
                              className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${getJobProgressPercent(job)}%` }}
                            />
                          </div>
                          {/* SOFT UNDER GLOW */}
                          <div 
                            className="absolute inset-0 bg-cyan-400/10 blur-sm rounded-full transition-all duration-700 pointer-events-none"
                            style={{ width: `${getJobProgressPercent(job)}%` }}
                          />
                        </div>

                        {/* SEGMENTED CONNECTIONS */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                          {getJobSteps(job).map((step, idx) => {
                            const isCompleted = step.status === 'completed';
                            const isInProgress = step.status === 'in_progress';
                            
                            return (
                              <button 
                                key={step.id} 
                                onClick={() => toggleJobStep(job.id, step.id)}
                                className={`text-left p-2.5 rounded-lg border transition-all duration-300 select-none cursor-pointer flex items-start gap-2 group ${
                                  isCompleted 
                                    ? 'bg-violet-955 bg-violet-950/20 border-violet-500/30 text-violet-200 hover:border-violet-400/50' 
                                    : isInProgress 
                                      ? 'bg-cyan-955 bg-cyan-950/20 border-cyan-500/40 text-cyan-200 hover:border-cyan-400/60' 
                                      : 'bg-slate-900/40 border-slate-800/40 text-slate-400 hover:bg-slate-800/20 hover:border-slate-800'
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isCompleted ? (
                                    <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-[10px]">
                                      ✓
                                    </span>
                                  ) : isInProgress ? (
                                    <span className="relative flex h-3.5 w-3.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 text-[10px] text-slate-950 items-center justify-center font-bold">●</span>
                                    </span>
                                  ) : (
                                    <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-700 group-hover:border-slate-500 block" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold tracking-tight line-clamp-1 text-slate-200 pr-1">
                                    M{idx + 1}: {step.title}
                                  </div>
                                  <span className={`text-[8.5px] font-mono leading-none capitalize ${
                                    isCompleted ? 'text-violet-400' : isInProgress ? 'text-cyan-400' : 'text-slate-500'
                                  }`}>
                                    {isCompleted ? 'verified phase' : isInProgress ? 'in progress' : 'pending'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                        <div className="font-mono text-slate-500 text-[11px]">
                          STATUS: <span className="text-violet-400 font-semibold">{job.status.toUpperCase()}</span>
                          {job.assignedDev && <> | ASSIGNED: <span className="text-white font-medium">{job.assignedDev}</span></>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {job.assignedDev && (
                            <button
                              onClick={() => openChat(job.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-medium transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Chat with {job.assignedDev.split(' ')[0]}</span>
                              {job.messages && job.messages.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-violet-600/30 border border-violet-500/40 text-violet-200 rounded text-[9px] font-mono">
                                  {job.messages.length}
                                </span>
                              )}
                            </button>
                          )}

                          {job.status === 'open' ? (
                            <button
                              onClick={() => {
                                const updated = marketplaceJobs.map(j => j.id === job.id ? { ...j, status: 'assigned' as const, assignedDev: 'Elena Rostova' } : j);
                                saveJobsToStorage(updated);
                              }}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-xs font-medium"
                            >
                              Assign Elite Architect Elena Rostova
                            </button>
                          ) : job.status === 'assigned' ? (
                            <button
                              onClick={() => {
                                const updated = marketplaceJobs.map(j => j.id === job.id ? { ...j, status: 'escrow' as const } : j);
                                saveJobsToStorage(updated);
                              }}
                              className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-semibold"
                            >
                              Deposit Budget in Escrow Container
                            </button>
                          ) : job.status === 'escrow' ? (
                            canValidate(job) ? (
                              <button
                                onClick={() => openValidationModal(job.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded text-xs font-semibold transition"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                <span>Validate & Release Payment</span>
                              </button>
                            ) : (
                              <span
                                title="Complete all milestones to enable validation"
                                className="px-3 py-1 bg-slate-800/60 border border-slate-700 text-slate-400 rounded text-[11px] font-mono"
                              >
                                Awaiting milestone completion
                              </span>
                            )
                          ) : (
                            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Paid Out Escrow Complete
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. DOCS VIEW INSIDE DASHBOARD ACCORDION */}
            {dashTab === 'docs' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider font-display">System APIs & JSON-RPC Guidelines</h2>
                  <p className="text-xs text-slate-400">Use this directory as a prompt helper when customizing the Model Context Protocol tools.</p>
                </div>

                <div className="space-y-4">
                  {DOC_SECTIONS.flatMap(s => s.items).slice(2, 5).map(doc => (
                    <div key={doc.id} className="p-5 bg-slate-900/60 border border-slate-850 rounded-xl space-y-2">
                      <h4 className="text-xs font-mono text-violet-400 uppercase tracking-widest">{doc.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{doc.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. SETTINGS VIEW */}
            {dashTab === 'settings' && (
              <div className="p-6 bg-slate-900/60 border border-slate-850 rounded-2xl space-y-6">

                {/* ————— Referral program ————— */}
                {(() => {
                  const uid = user?.uid || privyIdentity?.id || null;
                  const myCode = getMyReferralCode(uid);
                  const myLink = myCode ? buildReferralLink(myCode) : null;
                  const incoming = getAttribution();
                  return (
                    <div className="p-4 bg-gradient-to-br from-violet-950/40 to-slate-950/40 border border-violet-500/20 rounded-xl">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-white">Refer & earn — Devibe Creator Program</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            For AI influencers & devs. Share your link; earn a recurring share of every subscription it brings in.
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-violet-300 bg-violet-500/10 border border-violet-500/30 px-2 py-1 rounded">CREATOR</span>
                      </div>

                      {myCode ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-lg p-2">
                            <span className="text-[10px] font-mono text-slate-500 px-1">CODE</span>
                            <code className="text-xs font-mono text-violet-200">{myCode}</code>
                            <span className="flex-1" />
                            <button
                              onClick={() => navigator.clipboard.writeText(myCode)}
                              className="px-2 py-1 text-[10px] text-slate-300 hover:text-white bg-slate-900 border border-slate-700 rounded transition"
                            >
                              Copy
                            </button>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-lg p-2">
                            <span className="text-[10px] font-mono text-slate-500 px-1">LINK</span>
                            <code className="text-[11px] font-mono text-slate-200 truncate flex-1">{myLink}</code>
                            <button
                              onClick={() => myLink && navigator.clipboard.writeText(myLink)}
                              className="px-2 py-1 text-[10px] text-slate-300 hover:text-white bg-slate-900 border border-slate-700 rounded transition"
                            >
                              Copy
                            </button>
                          </div>
                          {incoming && (
                            <p className="text-[10px] text-emerald-300 mt-1">
                              You were invited via <code className="font-mono">{incoming}</code> — that creator gets credit on your first paid plan.
                            </p>
                          )}
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            Anyone who lands on Devibe via <code className="font-mono">?ref={myCode}</code> is attributed to you on first touch. Payouts are tracked server-side and credited on each subscription cycle.
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">Sign in to claim your creator link.</p>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider font-display">General Environment Config</h2>
                  <p className="text-xs text-slate-400">Set organization variables and credentials. All secrets are safely maintained server-side.</p>
                </div>

                <div className="space-y-4 text-xs text-slate-300">
                  {/* FIREBASE AUTHENTICATION CONFIG CHECKPOINT */}
                  <div className="p-5 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                      <span className="text-[10px] uppercase font-mono text-violet-400 font-bold block">Firebase Authentication Hub</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${user ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                        {user ? '● ACTIVE INTEGRATION' : '○ UNAUTHORIZED'}
                      </span>
                    </div>
                    {user ? (
                      <div className="space-y-4 pt-1">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                             <img 
                               src={user.photoURL} 
                               alt="Verified Avatar" 
                               referrerPolicy="no-referrer"
                               className="w-10 h-10 rounded-full border border-violet-500 object-cover"
                             />
                          ) : (
                             <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white text-xs">
                               {user.displayName?.slice(0, 2) || "U"}
                             </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-white">{user.displayName || 'Developer Account'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] bg-slate-900/40 p-3 rounded-lg border border-slate-900/50">
                          <div className="space-y-0.5">
                            <span className="text-slate-500 font-mono block text-[9px]">SECURITY VERIFIED</span>
                            <span className="text-white font-semibold">True</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-500 font-mono block text-[9px]">CREDENTIAL TENANT</span>
                            <span className="text-white font-mono truncate block">{user.tenantId || 'default-spark-project'}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-500 font-mono block text-[9px]">USER UID</span>
                            <span className="text-white font-mono break-all">{user.uid}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-500 font-mono block text-[9px]">FIREBASE PROJECT ID</span>
                            <span className="text-cyan-400 font-mono">igneous-effort-397814</span>
                          </div>
                        </div>
                        <button 
                          onClick={logout}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-lg transition text-[11px] flex items-center justify-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out Account</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          You are currently exploring this workspace as an anonymous guest. Link your Google Identity to enable Firebase-backed live blueprints and coordinate your production microservices.
                        </p>
                        <button 
                          onClick={loginWithGoogle}
                          className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 text-white font-bold rounded-lg transition text-[11px] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5 text-cyan-300" />
                          <span>Google Firebase Auth Connect</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Stripe Webhook Public ID</span>
                    <p className="text-white font-mono font-bold text-[11px]">whsec_9b67ad7812ef6c41...</p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Coordinated Gemini API configuration</span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      The platform automatically reads <span className="text-cyan-400 font-mono">GEMINI_API_KEY</span> from your secrets manager. There is no custom input required here.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-850 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-500">Build Version: 1.0.4 - RELEASE</span>
                    <button 
                      onClick={() => alert("Devibe Sandbox Database state successfully cleared.")}
                      className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/20 text-red-400 border border-red-900/20 rounded text-[11px] font-semibold"
                    >
                      Reset Local Sandbox Cache
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ————————————————— JOB CHAT PANEL (slide-in) ————————————————— */}
      {(() => {
        const job = activeChatJobId ? marketplaceJobs.find(j => j.id === activeChatJobId) : null;
        if (!job) return null;
        const dev = findDeveloperByName(job.assignedDev);
        const messages = job.messages ?? [];
        const isTyping = devTypingForJobId === job.id;

        return (
          <>
            <div
              className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm"
              onClick={() => { setActiveChatJobId(null); setChatInput(''); }}
            />
            <aside
              role="dialog"
              aria-label={`Chat with ${dev?.name ?? 'developer'}`}
              className="fixed top-0 right-0 z-[61] h-full w-full sm:w-[420px] bg-[#0F1424] border-l border-slate-800 shadow-2xl shadow-violet-950/30 flex flex-col"
            >
              {/* Header */}
              <header className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
                {dev?.avatar ? (
                  <img src={dev.avatar} alt={dev.name} className="w-9 h-9 rounded-full object-cover border border-violet-500/30" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center font-bold text-xs text-white">
                    {(dev?.name || job.assignedDev || 'D').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{dev?.name ?? job.assignedDev}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {dev?.title ?? 'Assigned developer'} • <span className="text-violet-400 font-mono uppercase">{job.status}</span>
                  </p>
                </div>
                <button
                  onClick={() => { setActiveChatJobId(null); setChatInput(''); }}
                  className="text-slate-400 hover:text-white text-lg leading-none px-2"
                  aria-label="Close chat"
                >
                  ×
                </button>
              </header>

              {/* Job pill */}
              <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono truncate">JOB: <span className="text-slate-200">{job.projectTitle}</span></span>
                <span className="text-emerald-400 font-bold">${job.budget}</span>
              </div>

              {/* Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && !isTyping && (
                  <p className="text-xs text-slate-500 text-center mt-8">
                    Say hi, share priorities, or ask for an update. {dev?.name?.split(' ')[0]} is ready.
                  </p>
                )}
                {messages.map(m => {
                  if (m.sender === 'system') {
                    return (
                      <div key={m.id} className="text-center">
                        <span className="inline-block text-[10px] font-mono text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full">
                          {m.text}
                        </span>
                      </div>
                    );
                  }
                  const isMe = m.sender === 'founder';
                  return (
                    <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {m.authorAvatar ? (
                        <img src={m.authorAvatar} alt={m.authorName} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
                      ) : (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 mt-0.5 ${isMe ? 'bg-violet-600' : 'bg-slate-700'}`}>
                          {m.authorName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className={`max-w-[78%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`text-xs leading-relaxed px-3 py-2 rounded-2xl ${
                          isMe
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-sm'
                            : 'bg-slate-800/80 text-slate-100 border border-slate-700 rounded-tl-sm'
                        }`}>
                          {m.text}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-0.5 font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="flex gap-2 items-center">
                    {dev?.avatar ? (
                      <img src={dev.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-700" />
                    )}
                    <div className="bg-slate-800/80 border border-slate-700 rounded-2xl rounded-tl-sm px-3 py-2 flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Composer */}
              <form
                onSubmit={(e) => { e.preventDefault(); sendChatMessage(job.id, chatInput); }}
                className="border-t border-slate-800 p-3 bg-[#0B0F19]"
              >
                <div className="flex items-end gap-2 bg-slate-900 border border-slate-700 focus-within:border-violet-500/60 rounded-xl p-2">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(job.id, chatInput); }
                    }}
                    rows={1}
                    placeholder={`Message ${dev?.name?.split(' ')[0] ?? 'developer'}…`}
                    className="flex-1 bg-transparent resize-none outline-none text-xs text-slate-100 placeholder-slate-500 px-1.5 py-1 max-h-32"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition active:scale-95"
                    aria-label="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                {canValidate(job) && (
                  <button
                    type="button"
                    onClick={() => openValidationModal(job.id)}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/20 text-[11px] font-semibold transition"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Validate job & release payment</span>
                  </button>
                )}
              </form>
            </aside>
          </>
        );
      })()}

      {/* ————————————————— VALIDATION MODAL ————————————————— */}
      {(() => {
        const job = validationJobId ? marketplaceJobs.find(j => j.id === validationJobId) : null;
        if (!job) return null;
        const steps = getJobSteps(job);
        const allPassed = steps.every(s => validationCriteria[s.id]);

        return (
          <>
            <div
              className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setValidationJobId(null)}
            />
            <div
              role="dialog"
              aria-label="Validate job"
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[71] w-[92%] max-w-md bg-[#0F1424] border border-slate-800 rounded-2xl shadow-2xl shadow-violet-950/40 p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Validate & release</span>
                  <h3 className="text-base font-bold text-white mt-0.5">{job.projectTitle}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Confirm each milestone meets your acceptance criteria. Approving releases ${job.budget} from escrow to {job.assignedDev}.
                  </p>
                </div>
                <button
                  onClick={() => setValidationJobId(null)}
                  className="text-slate-400 hover:text-white text-xl leading-none px-2"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
                {steps.map((s, idx) => {
                  const passed = !!validationCriteria[s.id];
                  return (
                    <button
                      key={s.id}
                      onClick={() => setValidationCriteria(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition ${
                        passed
                          ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400/50'
                          : 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        passed ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-950 border-slate-600 text-transparent'
                      }`}>
                        ✓
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-100">M{idx + 1}: {s.title}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${passed ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {passed ? 'accepted' : 'tap to accept'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Notes (optional)</label>
              <textarea
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
                rows={3}
                placeholder="Anything to flag, praise, or follow up on…"
                className="w-full bg-slate-950/60 border border-slate-700 focus:border-violet-500/60 outline-none rounded-lg text-xs text-slate-100 placeholder-slate-500 px-3 py-2 resize-none"
              />

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  onClick={() => submitValidation('changes_requested')}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition"
                >
                  Request changes
                </button>
                <button
                  onClick={() => submitValidation('approved')}
                  disabled={!allPassed}
                  className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
                  title={allPassed ? 'Approve and release payment' : 'Accept every milestone to enable approval'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve & release ${job.budget}
                </button>
              </div>
            </div>
          </>
        );
      })()}

    </div>
  );
}
