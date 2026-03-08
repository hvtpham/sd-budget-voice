# SD Budget Voice

**A community-driven budget survey that delivers real resident priorities to San Diego city council members and the mayor's office.**

Built for the Claude Community × City of San Diego Impact Lab Hackathon — March 2026.

---

## Team

| Name | Role |
|---|---|
| Hong Van Pham | Full-stack development, data analysis, UX design |

---

## Problem Statement

San Diego faces a **$120 million budget deficit** heading into FY2027. The mayor's [official budget survey](https://datasd.typeform.com/2027budget) asks residents to share opinions without providing:

- Actual dollar amounts for any department
- Year-over-year comparisons showing where budgets have already been cut
- Revenue options (new taxes, fee increases) or their tradeoffs
- Context on what service cuts actually mean for neighborhoods
- Any mechanism to connect individual input to the officials who decide

The result: preference data biased toward emotional responses, disconnected from the real numbers, and with no clear path to decision-makers.

**SD Budget Voice is the survey the city should have built.** It gives residents the real numbers, lets them make real tradeoffs, and delivers aggregate results directly to council members and the mayor's office.

---

## What It Does

A four-tab civic engagement tool built for real impact:

**1. Explore** — Interactive bar chart of FY2026 General Fund spending by department, sourced from the City's open data portal. Key facts, revenue source breakdown (interactive pie chart), union contract explainer, and a full FY2027 budget timeline so residents understand the process before they participate.

**2. Your Budget** — Sliders for each major department let residents propose % changes with real-time dollar impact. A live gap meter shows how choices close (or widen) the $120M deficit. Revenue options — hotel tax, sales tax, user fees, cannabis tax — are presented with voter-approval requirements and dollar estimates. Residents mark up to 3 top priorities that lead their letter to their council member.

**3. Take Action** — After submitting, residents can: (1) generate an AI-drafted letter to their specific council member, personalized from their slider choices and priorities; (2) sign up for email/SMS alerts at key budget milestones; (3) access a step-by-step civic action calendar with real dates for public hearings, the proposed budget release, and the final vote.

**4. Results** — Aggregate dashboard showing community spending preferences and revenue support by council district. District filter chips. "In residents' words" comment section.

**Community framing:** This is explicitly an independent community tool, not an official City survey. Submissions are collected and will be delivered to all nine council offices and the mayor before the proposed budget drops in April.

---

## How Claude Is Used

Claude (Haiku 4.5, `claude-haiku-4-5-20251001`) powers the letter generator in the Take Action tab:

- **Streaming generation** via the Anthropic SDK's `messages.stream()` API — text streams token-by-token directly to the user's browser via a `ReadableStream` response
- **Personalized from real data** — the prompt is built from the resident's actual slider values, dollar amounts, top priorities, and optional free-text comment
- **Tight formatting constraints** — the prompt enforces 60–90 word letters, factual tone, no emotional language, specific signature format
- **Server-side API route** (`app/api/generate-letter/route.ts`) with IP-based rate limiting (3 letters/IP/hour), origin allowlist, and 8KB body cap to prevent abuse

---

## Data Sources

| Source | How It's Used |
|---|---|
| [City of San Diego Operating Budget](https://data.sandiego.gov/datasets/operating-budget/) (`seshat.datasd.org/operating_budget/budget_operating_datasd.csv`) | FY2026 and FY2025 General Fund adopted budgets — aggregated by department, used for all slider values, year-over-year comparisons, and per-resident calculations |
| [City of San Diego Open Data Portal](https://data.sandiego.gov/) | Revenue source breakdown (Major Revenues department), union contract metadata, and $120M deficit figure validated against mayor's FY2027 survey |
| [San Diego City Council district pages](https://www.sandiego.gov/citycouncil) | Council member names, contact URLs, and district boundaries — used for letter routing and ZIP-to-district mapping |
| [City Clerk agenda calendar](https://www.sandiego.gov/city-clerk/officialdocs/council-agendas) | Budget hearing dates (FY2026 actuals used to estimate FY2027 dates in the civic action calendar) |

The operating budget dataset drives every core interaction: sliders, dollar figures, year-over-year deltas, personnel percentages, and union contract information are all derived from the same source data.

---

## Architecture

```
sd-budget-voice/
├── app/
│   ├── api/
│   │   └── generate-letter/
│   │       └── route.ts        # Claude Haiku streaming, rate limiting, origin check
│   ├── layout.tsx              # Metadata, font loading
│   ├── page.tsx                # Full single-page app (~2000 lines, React client component)
│   └── globals.css             # Tailwind v4, custom slider styles
├── public/
│   └── budget-data.json        # Pre-processed FY2026/FY2025 budget data
├── wrangler.toml               # Cloudflare Workers deployment config
└── open-next.config.ts         # OpenNext Cloudflare adapter config
```

**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4 · Recharts · Lucide React · Anthropic SDK

**Deployment:** Cloudflare Workers via `@opennextjs/cloudflare`

**Key technical decisions:**
- Budget data is pre-processed from the raw city CSV and bundled as static JSON for fast, reliable loads — the raw CSV is 63MB and the city's S3 endpoint doesn't support filtered queries
- Claude letter generation uses server-side streaming to minimize perceived latency
- All user state (sliders, priorities, comments, district, submission ID) persists to `localStorage` so residents can return and update before the June 1 deadline
- Submissions are deduplicated via a `crypto.randomUUID()` submission ID — the backend upserts on this key so residents can update without double-counting

---

## Live App

[https://sd-budget-voice.hongvanpham.workers.dev](https://sd-budget-voice.hongvanpham.workers.dev)

---

## Local Development

```bash
npm install
# add your Anthropic API key:
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
# open http://localhost:3000
```

## Deploy to Cloudflare

```bash
npm run deploy
# set API key as a secret:
npx wrangler secret put ANTHROPIC_API_KEY
```

---

## Judging Criteria

| Criteria | Our approach |
|---|---|
| **Civic Impact** | Solves the specific, named problem of San Diego's vague official budget survey. Gives residents real numbers, real tradeoffs, and a real path to officials. Targets a clear audience: engaged SD residents who want to participate meaningfully. |
| **Use of City Data** | Two fiscal years of operating budget data (FY25 + FY26) from data.sandiego.gov power every slider, delta, and per-resident figure. Revenue source breakdown derived from the same dataset. Council district routing uses official city contact data. |
| **Technical Execution** | Fully functional: explore, adjust, submit, write AI letter, take action. Streaming AI generation, localStorage persistence, IP rate limiting, mobile-responsive with bottom nav, district-filtered results dashboard. |
| **Presentation & Story** | Clear problem (official survey is broken) → clear solution (here's what it should look like) → clear impact (results delivered to all 9 council offices). |
