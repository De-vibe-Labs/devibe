import Stripe from "stripe";
import { env } from "../utils/env.js";
import type { DeveloperProfile } from "../db/schema.js";

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!stripe) stripe = new Stripe(env.STRIPE_SECRET_KEY);
  return stripe;
}

export interface MatchCriteria {
  requiredSkills: string[];
  budget?: number; // total budget in USD
  minRating?: number;
  preferredType?: DeveloperProfile["type"];
}

export interface MatchScore {
  developer: DeveloperProfile;
  score: number; // 0-100
  reasons: string[];
}

/**
 * Score candidate developers against job criteria. Pure & deterministic so it
 * can run without any external dependency and is easy to unit test.
 */
export function rankDevelopers(candidates: DeveloperProfile[], criteria: MatchCriteria): MatchScore[] {
  const required = criteria.requiredSkills.map((s) => s.toLowerCase());

  return candidates
    .map((dev) => {
      const reasons: string[] = [];
      let score = 0;

      const devSkills = dev.skills.map((s) => s.toLowerCase());
      const matched = required.filter((s) => devSkills.some((d) => d.includes(s) || s.includes(d)));
      const skillRatio = required.length ? matched.length / required.length : 1;
      score += skillRatio * 50;
      reasons.push(`Matched ${matched.length}/${required.length || 0} required skills`);

      // Rating contributes up to 20 points.
      score += (Math.min(dev.rating, 5) / 5) * 20;
      reasons.push(`Rating ${dev.rating.toFixed(1)}/5`);

      // Availability up to 15 points.
      const availabilityScore = { high: 15, medium: 9, low: 3 }[dev.availability] ?? 6;
      score += availabilityScore;
      reasons.push(`Availability: ${dev.availability}`);

      // Budget fit up to 15 points.
      if (criteria.budget && dev.hourlyRate > 0) {
        const affordableHours = criteria.budget / dev.hourlyRate;
        if (affordableHours >= 80) {
          score += 15;
          reasons.push(`Budget covers ~${Math.floor(affordableHours)}h`);
        } else if (affordableHours >= 40) {
          score += 8;
          reasons.push(`Budget covers ~${Math.floor(affordableHours)}h (tight)`);
        } else {
          reasons.push(`Budget may be too low (~${Math.floor(affordableHours)}h)`);
        }
      } else {
        score += 10;
      }

      if (criteria.preferredType && dev.type === criteria.preferredType) {
        score += 5;
        reasons.push(`Preferred type: ${dev.type}`);
      }

      if (criteria.minRating && dev.rating < criteria.minRating) {
        score -= 20;
        reasons.push(`Below minimum rating ${criteria.minRating}`);
      }

      return { developer: dev, score: Math.max(0, Math.min(100, Math.round(score))), reasons };
    })
    .sort((a, b) => b.score - a.score);
}

/** Create a held (manual-capture) PaymentIntent to fund escrow for a job. */
export async function createEscrow(amountUsd: number, jobId: string): Promise<string | null> {
  const client = getStripe();
  if (!client) return null;
  const intent = await client.paymentIntents.create({
    amount: Math.round(amountUsd * 100),
    currency: "usd",
    capture_method: "manual",
    metadata: { jobId, platform: "devibe" },
  });
  return intent.id;
}
