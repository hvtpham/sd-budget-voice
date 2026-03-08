import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// ── Rate limiting ─────────────────────────────────────────────────────────────
// In-memory: resets on cold start. Good enough for a low-traffic civic tool.
// Limits: 3 letters per IP per hour.

const RATE_LIMIT   = 3;
const RATE_WINDOW  = 60 * 60 * 1000; // 1 hour in ms
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

// Allowed origins — add your Vercel domain here when deployed
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://sd-budget-voice.vercel.app",
  "https://sd-budget-voice.hongvan-pham91.workers.dev",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false; // reject requests with no Origin header (e.g. direct curl)
  if (origin.startsWith("http://localhost")) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Priority {
  name: string;
  type: "spending" | "revenue";
}

interface SpendingItem {
  name: string;
  pct: number;
  dollars: number;
  contractNote?: string;
}

interface RevenueItem {
  label: string;
  amount: number;
  requiresVote: boolean;
}

interface LetterRequest {
  councilMember: string;
  district: string;
  topPriorities: Priority[];
  increases: SpendingItem[];
  cuts: SpendingItem[];
  revenues: RevenueItem[];
  appUrl: string;
  comment?: string;
  residentName?: string;
}

function buildPrompt(body: LetterRequest): string {
  const { councilMember, district, topPriorities, increases, cuts, revenues, appUrl } = body;

  const greeting = councilMember
    ? `Dear Council Member ${councilMember},`
    : `Dear Council Member,`;

  const districtLabel = district ? `District ${district}` : "San Diego";

  // Build a compact body — only include sections that have data
  const bodyLines: string[] = [];

  if (topPriorities.length > 0) {
    bodyLines.push(`Top priorities: ${topPriorities.map((p) => p.name).join(", ")}`);
  }
  if (increases.length > 0) {
    bodyLines.push(`Protect: ${increases.map((d) => `${d.name} ($${d.dollars.toFixed(0)}M adj/yr)`).join(", ")}`);
  }
  if (cuts.length > 0) {
    const cutStr = cuts.map((d) => {
      const base = `${d.name} (−${Math.abs(d.pct)}%, −$${d.dollars.toFixed(0)}M)`;
      return d.contractNote ? `${base} [${d.contractNote}]` : base;
    }).join("; ");
    bodyLines.push(`Accept cuts: ${cutStr}`);
  }
  if (revenues.length > 0) {
    bodyLines.push(`Support: ${revenues.map((r) => `${r.label} (+$${r.amount}M/yr${r.requiresVote ? ", needs voter approval" : ", Council vote only"})`).join("; ")}`);
  }
  if (body.comment?.trim()) {
    bodyLines.push(`Resident note: "${body.comment.trim()}"`);
  }

  return `Write a budget brief from a ${districtLabel} resident to their council member. This will be read by a staffer — make it scannable and factual, zero filler.

GREETING (use exactly): ${greeting}

RESIDENT DATA:
${bodyLines.join("\n")}

COMMUNITY SURVEY (${districtLabel} is part of a larger dataset):
${appUrl}

FORMAT RULES — follow precisely:
1. Start with one sentence: who they are + reference the survey URL and state it represents residents across all nine districts.
2. Then output the resident's data as tight labeled lines — use the exact labels and figures from RESIDENT DATA above. One line per category.
3. If a cut includes a contract note about June 2026, add one sentence (max 15 words) flagging it as a negotiation window — after that line only.
4. If a Resident note is present, weave its substance into the letter naturally — do not label it as a "note".
5. 60–90 words total. No exceptions.
5. No emotional language. No "I hope", "I urge", "I believe", "I feel", "I want to express". No pleasantries.
6. Close with exactly:
— ${body.residentName ? body.residentName + ", a " + districtLabel + " Resident" : "A " + districtLabel + " Resident"}

Output only the letter. No preamble, no quotes, no explanation.`;
}

export async function POST(req: NextRequest) {
  // ── Origin check ───────────────────────────────────────────────────────────
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new Response("Forbidden", { status: 403 });
  }

  // ── Rate limit ─────────────────────────────────────────────────────────────
  const ip    = getClientIp(req);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit reached. You can generate up to 3 letters per hour." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "3600",
        },
      }
    );
  }

  // ── API key ────────────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("ANTHROPIC_API_KEY not configured", { status: 500 });
  }

  // ── Body ───────────────────────────────────────────────────────────────────
  let body: LetterRequest;
  try {
    const text = await req.text();
    if (text.length > 8000) {
      return new Response("Request too large", { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // ── Stream from Claude ─────────────────────────────────────────────────────
  const client  = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 450,
          temperature: 1,
          messages: [{ role: "user", content: buildPrompt(body) }],
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-RateLimit-Remaining": String(limit.remaining),
    },
  });
}
