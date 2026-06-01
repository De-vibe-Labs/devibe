import { describe, it, expect } from "vitest";
import { rankDevelopers } from "../src/services/marketplace.js";
import type { DeveloperProfile } from "../src/db/schema.js";

function dev(p: Partial<DeveloperProfile>): DeveloperProfile {
  return {
    id: p.id ?? "d",
    name: p.name ?? "Dev",
    title: "",
    type: p.type ?? "freelancer",
    skills: p.skills ?? [],
    hourlyRate: p.hourlyRate ?? 50,
    rating: p.rating ?? 4,
    completedJobs: p.completedJobs ?? 10,
    availability: p.availability ?? "medium",
    githubUrl: null,
    verified: false,
    createdAt: new Date(),
  };
}

describe("rankDevelopers", () => {
  it("ranks the best skill+rating match first", () => {
    const candidates = [
      dev({ id: "a", skills: ["React", "Node"], rating: 4.9, availability: "high" }),
      dev({ id: "b", skills: ["PHP"], rating: 3.0, availability: "low" }),
    ];
    const ranked = rankDevelopers(candidates, { requiredSkills: ["React", "Node"] });
    expect(ranked[0]!.developer.id).toBe("a");
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });

  it("penalizes developers below the minimum rating", () => {
    const candidates = [dev({ id: "low", rating: 2, skills: ["React"] })];
    const ranked = rankDevelopers(candidates, { requiredSkills: ["React"], minRating: 4 });
    expect(ranked[0]!.reasons.join(" ")).toContain("Below minimum rating");
  });

  it("returns scores within 0-100", () => {
    const candidates = [dev({ skills: ["React"], rating: 5, availability: "high" })];
    const ranked = rankDevelopers(candidates, { requiredSkills: ["React"], budget: 10000 });
    expect(ranked[0]!.score).toBeLessThanOrEqual(100);
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(0);
  });
});
