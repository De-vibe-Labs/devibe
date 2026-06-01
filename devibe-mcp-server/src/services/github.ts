import { Octokit } from "@octokit/rest";
import { env } from "../utils/env.js";
import { ConfigError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

let octokit: Octokit | null = null;

function getOctokit(): Octokit {
  if (!env.GITHUB_TOKEN) {
    throw new ConfigError("GITHUB_TOKEN is not configured — GitHub features are unavailable.");
  }
  if (!octokit) {
    octokit = new Octokit({ auth: env.GITHUB_TOKEN, baseUrl: env.GITHUB_API_URL });
  }
  return octokit;
}

export function isGithubConfigured(): boolean {
  return Boolean(env.GITHUB_TOKEN);
}

export interface IssueInput {
  title: string;
  body: string;
  labels?: string[];
}

export interface CreatedIssue {
  number: number;
  url: string;
  title: string;
}

/** Create GitHub issues from task definitions. Throws if token missing. */
export async function createIssues(
  owner: string,
  repo: string,
  issues: IssueInput[],
): Promise<CreatedIssue[]> {
  const gh = getOctokit();
  const created: CreatedIssue[] = [];
  for (const issue of issues) {
    const { data } = await gh.issues.create({
      owner,
      repo,
      title: issue.title,
      body: issue.body,
      labels: issue.labels,
    });
    created.push({ number: data.number, url: data.html_url, title: data.title });
    logger.info({ owner, repo, number: data.number }, "created github issue");
  }
  return created;
}

export async function getRepo(owner: string, repo: string) {
  const gh = getOctokit();
  const { data } = await gh.repos.get({ owner, repo });
  return {
    fullName: data.full_name,
    defaultBranch: data.default_branch,
    private: data.private,
    openIssues: data.open_issues_count,
    url: data.html_url,
  };
}

/** Parse "owner/repo" or a full GitHub URL into its parts. */
export function parseRepo(input: string): { owner: string; repo: string } {
  const cleaned = input
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  const [owner, repo] = cleaned.split("/");
  if (!owner || !repo) {
    throw new ConfigError(`Invalid repository reference: "${input}". Expected "owner/repo".`);
  }
  return { owner, repo };
}
