# SD Budget Voice

**A context-rich, data-driven alternative to the City of San Diego's FY2027 budget survey.**

Built for the Claude Community × City of San Diego Impact Lab Hackathon — March 2026.

---

## Team

| Name | Role |
|---|---|
| Hong Van Pham | Full-stack development, data analysis, UX design |

---

## Problem Statement

The mayor's [FY2027 budget survey](https://datasd.typeform.com/2027budget) asks residents to share opinions on a $120M deficit without providing:
- Actual dollar amounts for any department
- Year-over-year comparisons
- Revenue options (taxes, fees)
- Context on what service cuts actually mean for residents

The result is preference data that is biased toward emotional responses and lacks the detail needed for meaningful civic input.

---

## What SD Budget Voice Does

A single-page civic engagement tool that replaces the mayor's survey with a genuinely useful, context-rich experience:

1. **Explore** — Interactive bar chart of the FY2026 General Fund by department, sourced directly from the City's open data portal. Residents see real dollar figures before giving opinions.

2. **Make Tradeoffs** — Sliders for each department let residents propose % changes with real-time dollar impact display. A live "budget gap meter" shows how choices affect the $120M deficit. Revenue options (sales tax, hotel tax, user fees) are presented with tradeoffs explained.

3. **Submit & Act** — Preferences are submitted with full dollar context. The confirmation screen provides direct links to contact council members, sign up for public comment, and read the full proposed budget.

---

## Data Sources

- **Operating Budget dataset** — City of San Diego Open Data Portal
  `https://seshat.datasd.org/operating_budget/budget_operating_datasd.csv`
  FY2026 General Fund adopted budget, aggregated by department
- **$120M deficit figure** — Mayor's own FY2027 budget survey intro text
- **Revenue source breakdowns** — Derived from the "Major Revenues" department in the operating budget dataset

---

## Architecture

```
sd-budget-voice/
├── app/
│   ├── layout.tsx          # Metadata, dark mode, font
│   └── page.tsx            # Full single-page app (React client component)
├── public/
│   └── budget-data.json    # Pre-processed budget data (departments, revenues, civic actions)
└── package.json
```

**Stack:** Next.js 16 · TypeScript · Tailwind CSS · Recharts · Lucide React

The budget data is pre-processed from the raw CSV and bundled as static JSON — no server required, no runtime API calls to the city.

---

## Local Development

```bash
npm install
npm run dev
# open http://localhost:3000
```

---

## How It Scores Against Judging Criteria

| Criteria | Approach |
|---|---|
| **Civic Impact** | Gives residents real data to form informed opinions; connects directly to civic action |
| **Use of City Data** | Real FY2026 operating budget from data.sandiego.gov — not mock data |
| **Technical Execution** | Fully functional MVP: explore, adjust sliders, see live budget impact, submit, act |
| **Presentation** | Clear problem/solution framing; contextual info at every step of the experience |
