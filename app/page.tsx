"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
  PieChart, Pie,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus,
  ExternalLink, CheckCircle, ArrowRight, Users,
  ChevronDown, ChevronUp, Copy, Check, Mail,
  BookOpen, SlidersHorizontal, Megaphone, BarChart2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Department = {
  id: string; name: string; fy26: number; fy25: number;
  pct: number; description: string; perResident: number;
  employees: number; context: string; previousCuts?: string;
  personnelPct: number; union: string;
  realisticCutMax: number; contractConstraint: string;
};
type RevenueOption = { label: string; value: number; note: string };
type Revenue = {
  id: string; name: string; fy26: number; description: string;
  controllable: boolean; requiresVoterApproval?: boolean; options?: RevenueOption[];
};
type CivicAction = { label: string; url: string; description: string };
type BudgetData = {
  deficit: number; fiscalYear: string; dataSource: string;
  departments: Department[]; revenues: Revenue[]; civicActions: CivicAction[];
};

// ── Council members ───────────────────────────────────────────────────────────

// ── ZIP → District lookup ─────────────────────────────────────────────────────
// Source: San Diego City Council district boundaries (post-2021 redistricting).
// Note: some ZIP codes straddle district lines — this maps to the primary district.

const ZIP_TO_DISTRICT: Record<string, string> = {
  // District 1 — LaCava (La Jolla, Pacific Beach, Carmel Valley, UTC, Torrey Pines, Del Mar Mesa)
  // Source: sandiego.gov/citycouncil/cd1/communities
  "92014": "1", "92037": "1", "92067": "1", "92093": "1",
  "92109": "1", "92121": "1", "92122": "1", "92130": "1",
  // District 2 — Campbell (Clairemont, Point Loma, Ocean Beach, Mission Bay, Old Town)
  // Source: sandiego.gov/citycouncil/cd2/communities
  "92106": "2", "92107": "2", "92110": "2", "92117": "2",
  // District 3 — Whitburn (Downtown, Little Italy, Hillcrest, North Park, Mission Hills)
  // Source: sandiego.gov/citycouncil/cd3/communities
  "92101": "3", "92103": "3", "92104": "3", "92116": "3",
  // District 4 — Foster (Encanto, Lincoln Park, Skyline, Paradise Hills, City Heights portion)
  // Source: sandiego.gov/citycouncil/cd4/communities
  "92105": "4", "92114": "4", "92139": "4",
  // District 5 — von Wilpert (Rancho Bernardo, Rancho Peñasquitos, Sabre Springs, Black Mountain)
  // Source: sandiego.gov/citycouncil/cd5/communities
  "92127": "5", "92128": "5", "92129": "5", "92131": "5",
  // District 6 — Lee (Kearny Mesa, Mira Mesa, Sorrento Valley, University City, Serra Mesa)
  // Source: sandiego.gov/citycouncil/cd6/communities
  "92111": "6", "92123": "6", "92126": "6", "92145": "6",
  // District 7 — Campillo (Mission Valley, Tierrasanta, San Carlos, Allied Gardens, Del Cerro)
  // Source: sandiego.gov/citycouncil/cd7/communities
  "92108": "7", "92119": "7", "92120": "7", "92124": "7",
  // District 8 — Moreno (Otay Mesa, San Ysidro)
  // Source: sandiego.gov/citycouncil/cd8/communities
  "92154": "8", "92173": "8",
  // District 9 — Elo-Rivera (Barrio Logan, Logan Heights, City Heights, College Area, South Park)
  // Source: sandiego.gov/citycouncil/cd9/communities
  "92102": "9", "92113": "9", "92115": "9",
};

// ── Council members ───────────────────────────────────────────────────────────

const COUNCIL_MEMBERS: Record<string, {
  name: string; contactUrl: string; email?: string;
}> = {
  "1": { name: "Joe LaCava",        contactUrl: "https://www.sandiego.gov/citycouncil/cd1/contact/form" },
  "2": { name: "Jennifer Campbell", contactUrl: "https://www.sandiego.gov/citycouncil/cd2/contact/form" },
  "3": { name: "Stephen Whitburn",  contactUrl: "https://www.sandiego.gov/citycouncil/cd3/contact-form" },
  "4": { name: "Henry L. Foster III", contactUrl: "https://www.sandiego.gov/citycouncil/cd4/contact-form" },
  "5": { name: "Marni von Wilpert", contactUrl: "https://www.sandiego.gov/citycouncil/cd5/contact/form" },
  "6": { name: "Kent Lee",          contactUrl: "https://www.sandiego.gov/citycouncil/cd6/contact-form", email: "KentLee@sandiego.gov" },
  "7": { name: "Raul Campillo",     contactUrl: "https://www.sandiego.gov/citycouncil/cd7/contact-form" },
  "8": { name: "Vivian Moreno",     contactUrl: "https://www.sandiego.gov/citycouncil/cd8/contact-form" },
  "9": { name: "Sean Elo-Rivera",   contactUrl: "https://www.sandiego.gov/citycouncil/cd9/contact-form" },
};

function generateLetter(
  data: BudgetData,
  sliders: Record<string, number>,
  revenueToggles: Record<string, number>,
  district: string,
  topPriorities: string[],
  appUrl: string,
): string {
  const cm = COUNCIL_MEMBERS[district];
  const districtLabel = district ? `District ${district}` : "San Diego";
  const greeting = cm ? `Dear Council Member ${cm.name},` : "Dear Council Member,";

  const increases = data.departments.filter((d) => sliders[d.id] > 0)
    .sort((a, b) => sliders[b.id] - sliders[a.id]);
  const cuts = data.departments.filter((d) => sliders[d.id] < 0)
    .sort((a, b) => sliders[a.id] - sliders[b.id]);
  const revenues = data.revenues.filter((r) => (revenueToggles[r.id] ?? 0) > 0);

  const contractNote: Record<string, string> = {
    police: "The POA contract expires June 30, 2026. The upcoming MOU negotiation is a direct opportunity to address personnel costs before this budget takes effect — I urge you to use that leverage.",
    fire: "The IAFF Local 145 contract expires June 30, 2026. As negotiations open, I ask that you pursue an agreement that reflects the city's fiscal reality.",
  };

  const parts: string[] = [];

  // Lead with top priorities if resident marked any
  if (topPriorities.length > 0) {
    const names = topPriorities.map((id) => {
      const dept = data.departments.find((d) => d.id === id);
      if (dept) return dept.name;
      const rev = data.revenues.find((r) => r.id === id);
      return rev ? rev.name : id;
    });
    const countWord = names.length === 1 ? "top priority is" : `top ${names.length} priorities are`;
    const nameList = names.length <= 2
      ? names.join(" and ")
      : names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
    parts.push(`My ${countWord}: ${nameList}. These are not abstract preferences — they are the issues that directly affect my neighborhood and I want them front and center in your deliberations.`);
  }

  if (increases.length > 0) {
    const names = increases.map((d) => d.name).join(", ");
    parts.push(`I want to see continued or increased investment in: ${names}. These services matter most to quality of life in my community and I do not want to see them cut to close the deficit.`);
  }

  if (cuts.length > 0) {
    const names = cuts.map((d) => d.name).join(", ");
    parts.push(`I believe there is room to reduce spending in: ${names}. I understand these are difficult tradeoffs, but I trust the Council to make them thoughtfully.`);
    for (const dept of cuts) {
      if (contractNote[dept.id]) parts.push(contractNote[dept.id]);
    }
  }

  if (revenues.length > 0) {
    const revLines = revenues.map((r) => {
      const opt = r.options?.find((o) => o.value === revenueToggles[r.id]);
      return opt?.label ?? r.name;
    }).join("; ");
    parts.push(`On the revenue side, I support: ${revLines}. San Diegans are willing to contribute to solutions — but we need to see the money used wisely.`);
  }

  return `${greeting}

I am a resident of ${districtLabel} writing to share my priorities for the FY2027 budget before the Council votes. San Diego faces a $120M structural deficit and I want my perspective on record.

${parts.join("\n\n")}

My input is part of a broader community dataset collected through an independent budget tool — not the mayor's survey. You can review aggregate results from residents across all nine districts here:

  ${appUrl}

I hope you will bring these priorities into your deliberations. The decisions made in the next 90 days will shape this city for years.

Sincerely,
A ${districtLabel} Resident`;
}

// ── Mock results ─────────────────────────────────────────────────────────────

// Per-district adjustments applied on top of the citywide average.
// In production these come from filtered query results.
const DISTRICT_OFFSETS: Record<string, Record<string, number>> = {
  "D1": { police: +2.4, homelessness: -2.1, stormwater: +1.6, parks: +1.2 },
  "D2": { police: +1.1, transportation: +2.2, parks: +1.4, homelessness: -1.0 },
  "D3": { homelessness: +4.2, police: -3.8, library: +2.6, parks: +1.0 },
  "D4": { homelessness: +3.1, transportation: +2.4, police: -2.3, library: +1.5 },
  "D5": { police: +3.2, fire: +1.8, homelessness: -2.8, transportation: +1.4 },
  "D6": { parks: +2.1, transportation: +1.8, police: -1.2, library: +1.0 },
  "D7": { transportation: +3.1, parks: +1.6, police: -1.0, homelessness: +1.2 },
  "D8": { homelessness: +2.8, transportation: +2.6, police: -1.8, parks: +0.8 },
  "D9": { homelessness: +3.6, library: +2.9, police: -3.1, parks: +1.4 },
};

const DISTRICT_POLICE_CUTS: Record<string, number> = {
  "D1": 31, "D2": 38, "D3": 64, "D4": 57,
  "D5": 27, "D6": 42, "D7": 44, "D8": 53, "D9": 61,
};

const DISTRICT_COMMENTS: Record<string, string[]> = {
  "D3": [
    "Homelessness outreach in North Park is working. Don't gut it.",
    "The library on University Ave is packed every day. It deserves more, not less.",
    "A hotel tax increase is fair — tourists benefit from these services too.",
  ],
  "D5": [
    "Public safety is non-negotiable in Rancho Bernardo.",
    "Fix the streets before anything else — my suspension can't take it.",
    "The fire station response times have to stay where they are.",
  ],
  "D9": [
    "City Heights families depend on every library branch we have.",
    "The homelessness services cuts from FY2026 were felt immediately here.",
    "Police reform and fiscal responsibility are not mutually exclusive.",
  ],
};

const MOCK_RESULTS = {
  totalResponses: 312,
  // Average spending preference by dept (positive = residents want more, negative = accept cuts)
  avgDeptChanges: [
    { id: "homelessness",  name: "Homelessness Strategies",  avg: +9.1 },
    { id: "parks",         name: "Parks & Recreation",       avg: +6.2 },
    { id: "library",       name: "Library",                  avg: +5.7 },
    { id: "transportation",name: "Transportation & Streets", avg: +4.8 },
    { id: "stormwater",    name: "Stormwater",               avg: +3.4 },
    { id: "fire",          name: "Fire-Rescue",              avg: +2.3 },
    { id: "other",         name: "Other Departments",        avg: -1.9 },
    { id: "citywide",      name: "Citywide & Admin",         avg: -2.6 },
    { id: "police",        name: "Police",                   avg: -4.1 },
  ],
  // Revenue options ranked by resident support — includes whether Council can act alone
  revenueSupportPct: [
    { id: "tot",           label: "Hotel tax +1%",           pct: 63, amount: 17,  councilOnly: true  },
    { id: "fees",          label: "User fee recovery",       pct: 52, amount: 25,  councilOnly: true  },
    { id: "sales_tax_025", label: "Sales tax +0.25%",        pct: 44, amount: 90,  councilOnly: false },
    { id: "cannabis",      label: "Cannabis tax increase",   pct: 38, amount: 4,   councilOnly: true  },
    { id: "business_tax",  label: "Business license reform", pct: 33, amount: 25,  councilOnly: false },
    { id: "sales_tax_05",  label: "Sales tax +0.5%",         pct: 27, amount: 180, councilOnly: false },
  ],
  // Contract negotiation signal (citywide)
  wantPoliceCuts: 48,
  // Responses by district (for councilmember context)
  byDistrict: [
    { district: "D1", responses: 38 },
    { district: "D2", responses: 29 },
    { district: "D3", responses: 52 },
    { district: "D4", responses: 31 },
    { district: "D5", responses: 27 },
    { district: "D6", responses: 44 },
    { district: "D7", responses: 35 },
    { district: "D8", responses: 26 },
    { district: "D9", responses: 30 },
  ],
  topComments: [
    "Homelessness outreach saved my neighbor. Don't cut what's finally working.",
    "My street hasn't been repaved in 12 years. The $3B backlog is real.",
    "The library is the only free, safe space in my neighborhood for kids after school.",
    "A 1% hotel tax increase is a no-brainer — visitors pay it, not residents.",
    "Police costs are 29% of the budget. That contract renewal is the biggest lever we have.",
  ],
};

const DEPT_COLORS = [
  "#0f766e","#0d9488","#14b8a6","#2dd4bf",
  "#5eead4","#6366f1","#818cf8","#a78bfa","#c4b5fd",
];

const SUBMISSION_DEADLINE = new Date("2026-06-01T00:00:00");
const STORAGE_KEY = "sdbv_v1";
const COMMENT_MAX = 280;

const SPEND_STOPS = [-15, -10, -5, 0, 5, 10, 15];

function fmtM(n: number) {
  return `$${Math.abs(n).toFixed(0)}M`;
}

// ── Revenue pie chart ─────────────────────────────────────────────────────────

const REV_SOURCES = [
  { label: "Property Tax",          value: 37, color: "#0d9488", note: "City keeps only ~17¢/$ (Prop 13) — can't raise rate alone" },
  { label: "State/Federal & Other", value: 20, color: "#94a3b8", note: "Mostly restricted — can't plug a general deficit" },
  { label: "Sales Tax",             value: 17, color: "#2dd4bf", note: "Requires voter approval to raise" },
  { label: "Fees & Charges",        value: 12, color: "#818cf8", note: "Council can adjust — IBA says city under-recovers by ~$25M" },
  { label: "Hotel Tax (TOT)",       value:  8, color: "#6366f1", note: "Council vote only — fastest lever, +$17M per 1%" },
  { label: "Business Tax",          value:  6, color: "#f59e0b", note: "Reform could yield $20–25M — structure unchanged since 1970s" },
];

// ── Expandable accordion ───────────────────────────────────────────────────────

function Expandable({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
      >
        {label}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ── Chart label that wraps long department names onto two lines ───────────────

function WrappedYAxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (!payload || x === undefined || y === undefined) return null;
  const text = payload.value;
  const breakAt = 14; // chars before we wrap
  if (text.length <= breakAt) {
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fill="#1c1917" fontSize={11}>
        {text}
      </text>
    );
  }
  // Find the last space at or before breakAt
  let split = text.lastIndexOf(" ", breakAt);
  if (split === -1) split = breakAt;
  const line1 = text.slice(0, split).trim();
  const line2 = text.slice(split).trim();
  return (
    <text x={x} y={y} textAnchor="end" fill="#1c1917" fontSize={11}>
      <tspan x={x} dy={-5}>{line1}</tspan>
      <tspan x={x} dy={14}>{line2}</tspan>
    </text>
  );
}

function RevenuePieChart() {
  const [activeSlice, setActiveSlice] = useState<number | null>(null);
  const active = activeSlice !== null ? REV_SOURCES[activeSlice] : null;

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
      <h2 className="text-lg font-bold text-stone-900 mb-1">Where does the money come from?</h2>
      <p className="text-sm text-stone-500 mb-4">
        San Diego&apos;s General Fund comes from a mix of taxes, fees, and transfers — each with different rules on who controls them. Tap a slice to learn more.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Donut */}
        <div className="relative w-full sm:w-56 shrink-0">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={REV_SOURCES}
                dataKey="value"
                nameKey="label"
                cx="50%" cy="50%"
                innerRadius={62} outerRadius={95}
                paddingAngle={2}
                onClick={(_, i) => setActiveSlice(activeSlice === i ? null : i)}
                style={{ cursor: "pointer" }}
              >
                {REV_SOURCES.map((src, i) => (
                  <Cell
                    key={src.label}
                    fill={src.color}
                    opacity={activeSlice === null || activeSlice === i ? 1 : 0.35}
                    stroke={activeSlice === i ? "#1c1917" : "transparent"}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {active ? (
              <>
                <span className="text-2xl font-extrabold text-stone-900">{active.value}%</span>
                <span className="text-xs font-semibold text-stone-500 text-center px-6 leading-tight">{active.label}</span>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-stone-400">General</span>
                <span className="text-sm font-semibold text-stone-400">Fund</span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-1.5">
          {REV_SOURCES.map((src, i) => (
            <button
              key={src.label}
              onClick={() => setActiveSlice(activeSlice === i ? null : i)}
              className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                activeSlice === i ? "bg-stone-100" : "hover:bg-stone-50"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: src.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-sm font-semibold text-stone-800 truncate">{src.label}</span>
                  <span className="text-sm font-bold text-stone-700 shrink-0">{src.value}%</span>
                </div>
                {activeSlice === i && (
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{src.note}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Budget gap meter ──────────────────────────────────────────────────────────

function GapMeter({ gap }: { gap: number }) {
  const balanced = Math.abs(gap) < 5;
  const surplus  = gap < -5;
  const pct = Math.min(100, Math.max(0, ((120 - gap) / 120) * 100));

  return (
    <div className="bg-[#FFFDF9] border border-stone-200 rounded-3xl px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-0.5">
            Financial impact of your choices
          </p>
          <p className={`text-2xl sm:text-3xl font-extrabold leading-none ${
            balanced ? "text-emerald-600" : surplus ? "text-teal-600" : "text-stone-800"
          }`}>
            {surplus ? "–" : ""}{fmtM(gap)}
          </p>
        </div>
        <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
          balanced ? "bg-emerald-100 text-emerald-700"
          : surplus  ? "bg-teal-100 text-teal-700"
          :            "bg-stone-100 text-stone-600"
        }`}>
          {balanced ? "Gap covered ✓" : surplus ? "Surplus" : `$${gap.toFixed(0)}M remaining`}
        </div>
      </div>
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            balanced ? "bg-emerald-500" : surplus ? "bg-teal-500" : "bg-teal-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-stone-400 mt-1.5">
        Your input matters regardless of whether it fully closes the gap — the Council has tools residents don&apos;t.
      </p>
    </div>
  );
}

// ── Spending card ─────────────────────────────────────────────────────────────

function SpendingCard({
  dept, value, onChange, isPriority, onTogglePriority, canAddMore,
}: {
  dept: Department; value: number; onChange: (v: number) => void;
  isPriority: boolean; onTogglePriority: () => void; canAddMore: boolean;
}) {
  const [showConstraints, setShowConstraints] = useState(false);
  const idx = Math.max(0, SPEND_STOPS.indexOf(value) === -1 ? 3 : SPEND_STOPS.indexOf(value));
  const dollar = (dept.fy26 * value) / 100;
  const isUp   = value > 0;
  const isDown = value < 0;

  return (
    <div className={`bg-white rounded-3xl border transition-all shadow-sm ${
      isUp   ? "border-emerald-300 shadow-emerald-50"
      : isDown ? "border-rose-200 shadow-rose-50"
      :          "border-stone-200"
    }`}>
      {/* Top: name + amounts */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-lg font-bold text-stone-900 leading-tight">{dept.name}</h3>
            <p className="text-sm text-stone-500 mt-0.5">{dept.pct}% of the city budget</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl sm:text-2xl font-extrabold text-stone-900">${dept.fy26.toFixed(0)}M</p>
            <p className="text-xs text-stone-400">per year</p>
          </div>
        </div>

        {/* What it funds */}
        <p className="text-base text-stone-700 leading-relaxed mb-3">{dept.description}</p>

        {/* Key fact */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
          <p className="text-sm text-amber-900 leading-relaxed">
            <span className="font-semibold">Keep in mind: </span>{dept.context}
          </p>
        </div>

        {/* Already cut */}
        {dept.previousCuts && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-3">
            <p className="text-sm text-rose-900 leading-relaxed">
              <span className="font-semibold">Already reduced: </span>{dept.previousCuts}
            </p>
          </div>
        )}

        {/* Contract & personnel reality — collapsible */}
        <div className="border border-violet-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowConstraints((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 bg-violet-50 hover:bg-violet-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">
                Who works here &amp; what limits cuts
              </p>
              {/* Mini personnel bar inline */}
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-violet-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full" style={{ width: `${dept.personnelPct}%` }} />
                </div>
                <span className="text-xs text-violet-500">{dept.personnelPct}% people</span>
              </div>
            </div>
            {showConstraints
              ? <ChevronUp className="w-4 h-4 text-violet-400 shrink-0" />
              : <ChevronDown className="w-4 h-4 text-violet-400 shrink-0" />}
          </button>

          {showConstraints && (
            <div className="bg-violet-50 px-4 pb-4 pt-2 border-t border-violet-100">
              <div className="mb-2.5">
                <div className="flex justify-between text-xs font-semibold text-violet-700 mb-1">
                  <span>Personnel (salaries &amp; benefits)</span>
                  <span>{dept.personnelPct}% of budget</span>
                </div>
                <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full" style={{ width: `${dept.personnelPct}%` }} />
                </div>
              </div>
              <p className="text-xs text-violet-700 font-semibold mb-1.5">Covered by: {dept.union}</p>
              <p className="text-sm text-violet-900 leading-relaxed">{dept.contractConstraint}</p>
            </div>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="border-t border-stone-100 px-5 py-4">
        {/* Current selection */}
        <div className="flex items-center gap-2 mb-3">
          {value === 0 && <Minus className="w-5 h-5 text-stone-400 shrink-0" />}
          {isDown     && <TrendingDown className="w-5 h-5 text-red-500 shrink-0" />}
          {isUp       && <TrendingUp   className="w-5 h-5 text-emerald-600 shrink-0" />}
          <span className={`text-base font-bold ${
            value === 0 ? "text-stone-400" : isUp ? "text-emerald-700" : "text-red-600"
          }`}>
            {value === 0
              ? "No change — keep funding the same"
              : isUp
              ? `Increase by ${value}% (+${fmtM(dollar)}/yr)`
              : `Reduce by ${Math.abs(value)}% (−${fmtM(dollar)}/yr)`}
          </span>
        </div>

        <input
          type="range" min={0} max={6} step={1} value={idx}
          onChange={(e) => onChange(SPEND_STOPS[parseInt(e.target.value)])}
          className="w-full h-2 cursor-pointer"
        />

        <div className="flex justify-between mt-2 text-sm text-stone-400 font-medium">
          <span>Spend less</span>
          <span>Same as now</span>
          <span>Spend more</span>
        </div>

        {/* Warning when slider exceeds realistic cut */}
        {value < dept.realisticCutMax && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
            <p className="text-sm text-orange-800 leading-relaxed">
              <span className="font-semibold">Heads up:</span> A {Math.abs(value)}% cut exceeds
              what&apos;s realistically achievable under the current {dept.union} contract.
              Getting there would require renegotiating the MOU (which expires June 30, 2026)
              and likely take multiple budget cycles. Your preference is still recorded — this
              just helps you understand the timeline.
            </p>
          </div>
        )}

        {/* Top priority toggle */}
        <button
          onClick={onTogglePriority}
          disabled={!isPriority && !canAddMore}
          className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
            isPriority
              ? "border-amber-400 bg-amber-50 text-amber-800"
              : canAddMore
              ? "border-stone-200 text-stone-500 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-700"
              : "border-stone-100 text-stone-300 cursor-not-allowed"
          }`}
        >
          {isPriority ? "★ Top priority" : "☆ Mark as top priority"}
        </button>
      </div>
    </div>
  );
}

// ── Revenue card ──────────────────────────────────────────────────────────────

function RevenueCard({
  rev, value, onChange, isPriority, onTogglePriority, canAddMore,
}: {
  rev: Revenue; value: number; onChange: (v: number) => void;
  isPriority: boolean; onTogglePriority: () => void; canAddMore: boolean;
}) {
  const opts = rev.options ?? [];
  const selectedOpt = opts.find((o) => o.value === value) ?? null;

  // Non-controllable: informational only
  if (!rev.controllable) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-stone-900 leading-tight">{rev.name}</h3>
            {rev.fy26 > 0 && (
              <p className="text-sm text-stone-500 mt-0.5">Currently raises ${rev.fy26.toFixed(0)}M/yr</p>
            )}
          </div>
          <span className="text-xs font-semibold bg-stone-100 text-stone-500 px-3 py-1 rounded-full shrink-0">
            Fixed by state law
          </span>
        </div>
        <p className="text-sm text-stone-500 leading-relaxed italic">{rev.description}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-3xl border transition-all shadow-sm ${
      value > 0 ? "border-teal-300 shadow-teal-50" : "border-stone-200"
    }`}>
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-stone-900 leading-tight">{rev.name}</h3>
            {rev.fy26 > 0 && (
              <p className="text-sm text-stone-500 mt-0.5">Currently raises ${rev.fy26.toFixed(0)}M/yr</p>
            )}
          </div>
          {rev.requiresVoterApproval
            ? <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full shrink-0">Requires voter approval</span>
            : <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full shrink-0">Council can approve</span>
          }
        </div>
        <p className="text-base text-stone-700 leading-relaxed">{rev.description}</p>
      </div>

      {/* Choice buttons */}
      <div className="border-t border-stone-100 px-5 py-4 space-y-2">
        <p className="text-sm font-semibold text-stone-600 mb-3">Would you support this?</p>

        {/* No / keep as is */}
        <button
          onClick={() => onChange(0)}
          className={`w-full flex items-center justify-between gap-3 px-4 py-4 rounded-2xl border text-left transition-all ${
            value === 0
              ? "border-stone-400 bg-stone-100 text-stone-800"
              : "border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50"
          }`}
        >
          <span className="font-semibold text-sm">No — keep as is</span>
          {value === 0
            ? <div className="w-5 h-5 rounded-full bg-stone-500 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div>
            : <div className="w-5 h-5 rounded-full border-2 border-stone-300 shrink-0" />}
        </button>

        {/* One option per button */}
        {opts.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-4 rounded-2xl border text-left transition-all active:scale-[0.99] ${
              value === opt.value
                ? "border-teal-400 bg-teal-50 text-teal-900"
                : "border-stone-200 text-stone-700 hover:border-teal-200 hover:bg-teal-50/50"
            }`}
          >
            <span className="font-semibold text-sm leading-snug">{opt.label}</span>
            {value === opt.value
              ? <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div>
              : <div className="w-5 h-5 rounded-full border-2 border-stone-300 shrink-0" />
            }
          </button>
        ))}

        {/* Context note for selected option */}
        {selectedOpt?.note && (
          <p className="text-sm text-stone-500 bg-stone-50 rounded-xl px-3 py-2.5 border border-stone-200 leading-relaxed">
            {selectedOpt.note}
          </p>
        )}

        {/* Top priority toggle */}
        <button
          onClick={onTogglePriority}
          disabled={!isPriority && !canAddMore}
          className={`mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
            isPriority
              ? "border-amber-400 bg-amber-50 text-amber-800"
              : canAddMore
              ? "border-stone-200 text-stone-500 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-700"
              : "border-stone-100 text-stone-300 cursor-not-allowed"
          }`}
        >
          {isPriority ? "★ Top priority" : "☆ Mark as top priority"}
        </button>
      </div>
    </div>
  );
}

// ── Results section ───────────────────────────────────────────────────────────

function ResultsSection({ data: _data, userComment, hasSubmitted }: { data: BudgetData; userComment: string; hasSubmitted: boolean }) {
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const r = MOCK_RESULTS;

  // Apply per-district offsets when a district is selected
  const districtKey = selectedDistrict !== "all" ? `D${selectedDistrict}` : null;
  const offsets = districtKey ? (DISTRICT_OFFSETS[districtKey] ?? {}) : {};
  const activeChanges = r.avgDeptChanges.map((d) => ({
    ...d,
    avg: parseFloat((d.avg + (offsets[d.id] ?? 0)).toFixed(1)),
  }));
  const activePoliceCuts = districtKey
    ? (DISTRICT_POLICE_CUTS[districtKey] ?? r.wantPoliceCuts)
    : r.wantPoliceCuts;
  const activeResponses = districtKey
    ? (r.byDistrict.find((d) => d.district === districtKey)?.responses ?? 0)
    : r.totalResponses;
  const activeComments = (districtKey && DISTRICT_COMMENTS[districtKey])
    ? DISTRICT_COMMENTS[districtKey]
    : r.topComments;

  const deptChartData = [...activeChanges]
    .sort((a, b) => b.avg - a.avg)
    .map((d) => ({
      name: d.name.length > 20 ? d.name.slice(0, 19) + "…" : d.name,
      avg: d.avg,
      fill: d.avg >= 0 ? "#0d9488" : "#dc2626",
    }));

  const councilOnlyRevenue = r.revenueSupportPct.filter((r) => r.councilOnly);
  const majorityRevenue    = r.revenueSupportPct.filter((r) => r.pct >= 50);

  return (
    <div className="space-y-6">

      {/* Illustrative notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
        <span className="text-amber-500 text-lg shrink-0 mt-0.5">⚠</span>
        <p className="text-sm text-amber-900 leading-relaxed">
          <span className="font-semibold">Illustrative data only.</span> The numbers, charts, and quotes below are sample data to demonstrate what this dashboard will show once real submissions are collected. They do not reflect actual survey responses.
        </p>
      </div>

      {/* Participation header */}
      <div className="bg-[#FFFDF9] border border-stone-200 rounded-3xl p-6 shadow-sm">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">Community input · FY2027 Budget</p>
        <p className="text-4xl font-extrabold text-stone-900 mb-1">{activeResponses.toLocaleString()}</p>
        <p className="text-base text-stone-600">
          {selectedDistrict === "all"
            ? "San Diego residents submitted budget priorities across all 9 council districts."
            : `Responses from District ${selectedDistrict} residents.`}
        </p>

        {/* District filter chips */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Filter by district</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedDistrict("all")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                selectedDistrict === "all"
                  ? "bg-teal-600 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              All Districts
            </button>
            {r.byDistrict.map((d) => {
              const num = d.district.replace("D", "");
              return (
                <button
                  key={d.district}
                  onClick={() => setSelectedDistrict(selectedDistrict === num ? "all" : num)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    selectedDistrict === num
                      ? "bg-teal-600 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {d.district} <span className="opacity-60 font-normal">({d.responses})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spending direction */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
        <h3 className="text-base font-bold text-stone-900 mb-0.5">Resident spending priorities</h3>
        <p className="text-sm text-stone-500 mb-4">
          Average preferred change across {activeResponses} {selectedDistrict === "all" ? "citywide" : `District ${selectedDistrict}`} responses, ranked by signal strength
        </p>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={deptChartData} layout="vertical" margin={{ left: 0, right: 40, top: 2, bottom: 2 }}>
            <XAxis type="number" tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
              tick={{ fill: "#a8a29e", fontSize: 11 }} axisLine={false} tickLine={false} domain={[-10, 15]} />
            <YAxis type="category" dataKey="name" width={120}
              tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} />
            <ReferenceLine x={0} stroke="#e7e5e4" strokeWidth={2} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(1)}%`, "Avg preference"]}
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e7e5e4",
                borderRadius: "12px", fontSize: "12px", boxShadow: "0 4px 12px rgb(0 0 0 / 0.07)" }} />
            <Bar dataKey="avg" radius={[0, 5, 5, 0]}>
              {deptChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Contract signal */}
        {activePoliceCuts > 40 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">{activePoliceCuts}% of {selectedDistrict === "all" ? "" : `District ${selectedDistrict} `}respondents want Police spending reduced.</span>{" "}
              The POA contract expires June 30, 2026 — the MOU negotiation this spring is the primary lever for addressing personnel cost growth.
            </p>
          </div>
        )}
      </div>

      {/* Revenue — Council-actionable first */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
        <h3 className="text-base font-bold text-stone-900 mb-0.5">Revenue options with resident support</h3>
        <p className="text-sm text-stone-500 mb-4">Ranked by support. Council-only options require no ballot measure.</p>

        {majorityRevenue.length > 0 && (
          <div className="mb-4 bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3">
            <p className="text-sm font-semibold text-teal-900 mb-1">Majority support — actionable now</p>
            <div className="space-y-1">
              {majorityRevenue.map((rev) => (
                <p key={rev.id} className="text-sm text-teal-800">
                  · <strong>{rev.label}</strong> — {rev.pct}% support, +${rev.amount}M/yr
                  {rev.councilOnly
                    ? <span className="ml-1.5 text-xs font-semibold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">Council vote only</span>
                    : <span className="ml-1.5 text-xs font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Needs voter approval</span>}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {r.revenueSupportPct.map((rev) => (
            <div key={rev.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-stone-800">{rev.label}</span>
                  {rev.councilOnly
                    ? <span className="text-xs font-semibold bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">Council only</span>
                    : <span className="text-xs font-semibold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">Voter approval</span>}
                </div>
                <span className="text-sm font-bold text-stone-700 shrink-0 ml-3">{rev.pct}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${rev.pct >= 50 ? "bg-teal-500" : "bg-stone-300"}`}
                  style={{ width: `${rev.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {councilOnlyRevenue.length > 0 && (
          <p className="mt-4 text-xs text-stone-400">
            Council-only options: {councilOnlyRevenue.map((r) => r.label).join(", ")} — no ballot measure required.
          </p>
        )}
      </div>

      {/* Resident voices */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
        <h3 className="text-base font-bold text-stone-900 mb-4">In residents&apos; words</h3>
        <div className="space-y-3">
          {/* Show user's own comment first if they submitted one */}
          {hasSubmitted && userComment.trim() && (
            <div className="flex items-start gap-3 pb-3 border-b border-teal-100">
              <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-teal-600 mb-0.5">Your comment</p>
                <p className="text-sm text-stone-700 leading-relaxed">&ldquo;{userComment}&rdquo;</p>
              </div>
            </div>
          )}
          {activeComments.map((comment, i) => (
            <div key={i} className="flex items-start gap-3 pb-3 border-b border-stone-100 last:border-0 last:pb-0">
              <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-3.5 h-3.5 text-stone-500" />
              </div>
              <p className="text-sm text-stone-700 leading-relaxed">&ldquo;{comment}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-stone-400 text-center leading-relaxed px-4">
        <a href="https://data.sandiego.gov/datasets/operating-budget/" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline">City of San Diego operating budget data source.</a>
      </p>
    </div>
  );
}

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: "explore",   label: "Explore",     short: "Explore", Icon: BookOpen },
  { key: "tradeoffs", label: "Your Budget",  short: "Budget",  Icon: SlidersHorizontal },
  { key: "submit",    label: "Take Action",  short: "Act",     Icon: Megaphone },
  { key: "results",   label: "Results",      short: "Results", Icon: BarChart2 },
] as const;

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [data, setData]                   = useState<BudgetData | null>(null);
  const [sliders, setSliders]             = useState<Record<string, number>>({});
  const [revenueToggles, setRevenueToggles] = useState<Record<string, number>>({});
  const [submitted, setSubmitted]         = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [zipCode, setZipCode]             = useState("");
  const [district, setDistrict]           = useState("");
  const [comments, setComments]           = useState("");
  const [letterDraft, setLetterDraft]       = useState("");
  const [copied, setCopied]                 = useState(false);
  const [topPriorities, setTopPriorities]   = useState<string[]>([]);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [section, setSection]             = useState<"explore"|"tradeoffs"|"submit"|"results">("explore");
  const [budgetSubTab, setBudgetSubTab]   = useState<"spending"|"revenue">("spending");
  const [submissionId, setSubmissionId]   = useState("");
  const [submittedAt, setSubmittedAt]     = useState("");
  const [residentName, setResidentName]   = useState("");
  const [phoneNumber, setPhoneNumber]     = useState("");
  const [emailAddress, setEmailAddress]   = useState("");
  const [smsSignedUp, setSmsSignedUp]     = useState(false);
  const [smsSigningUp, setSmsSigningUp]   = useState(false);

  // Load budget data, then restore any saved state from localStorage
  useEffect(() => {
    fetch("/budget-data.json")
      .then((r) => r.json())
      .then((d: BudgetData) => {
        setData(d);
        const init: Record<string, number> = {};
        d.departments.forEach((dept) => (init[dept.id] = 0));

        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const p = JSON.parse(raw);
            // Restore sliders — only keep keys that exist in current data
            const restored: Record<string, number> = { ...init };
            if (p.sliders) {
              Object.entries(p.sliders as Record<string, number>).forEach(([k, v]) => {
                if (k in restored) restored[k] = v;
              });
            }
            setSliders(restored);
            if (p.revenueToggles) setRevenueToggles(p.revenueToggles);
            if (Array.isArray(p.topPriorities)) setTopPriorities(p.topPriorities);
            if (typeof p.comments === "string") setComments(p.comments);
            if (p.zipCode) setZipCode(p.zipCode);
            if (p.district) setDistrict(p.district);
            if (p.submitted) setSubmitted(true);
            if (p.submittedAt) setSubmittedAt(p.submittedAt);
            if (typeof p.residentName === "string") setResidentName(p.residentName);
            if (typeof p.phoneNumber === "string") setPhoneNumber(p.phoneNumber);
            if (typeof p.emailAddress === "string") setEmailAddress(p.emailAddress);
            if (p.smsSignedUp) setSmsSignedUp(true);
            setSubmissionId(p.submissionId || crypto.randomUUID());
          } else {
            setSliders(init);
            setSubmissionId(crypto.randomUUID());
          }
        } catch {
          setSliders(init);
          setSubmissionId(crypto.randomUUID());
        }
      });
  }, []);

  // Persist state to localStorage whenever anything changes
  useEffect(() => {
    if (!submissionId) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sliders, revenueToggles, topPriorities, comments,
        zipCode, district, submitted, submissionId, submittedAt,
        residentName, phoneNumber, emailAddress, smsSignedUp,
      }));
    } catch { /* private browsing / storage full — ignore */ }
  }, [sliders, revenueToggles, topPriorities, comments, zipCode, district, submitted, submissionId, submittedAt, residentName, phoneNumber, emailAddress, smsSignedUp]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500 text-base" style={{ background: "var(--background)" }}>
        Loading…
      </div>
    );
  }

  const spendingDelta = data.departments.reduce(
    (sum, dept) => sum + (dept.fy26 * (sliders[dept.id] || 0)) / 100, 0
  );
  const revenueDelta = Object.values(revenueToggles).reduce((s, v) => s + v, 0);
  const gap = 120 + spendingDelta - revenueDelta;
  const progressPct = { explore: 15, tradeoffs: 50, submit: 80, results: 100 }[section];

  const chartData = [...data.departments]
    .sort((a, b) => b.fy26 - a.fy26)
    .map((d, i) => ({
      name: d.name.length > 22 ? d.name.slice(0, 21) + "…" : d.name,
      fy26: d.fy26,
      color: DEPT_COLORS[i % DEPT_COLORS.length],
    }));

  const handleSubmit = async () => {
    setSubmitting(true);
    const now = new Date().toISOString();
    const preferences = {
      submissionId,  // backend uses this to upsert — prevents duplicate counts
      zipCode, district, comments: comments.trim(),
      topPriorities,
      spendingAdjustments: Object.entries(sliders).filter(([, v]) => v !== 0).map(([id, pct]) => {
        const dept = data.departments.find((d) => d.id === id)!;
        return { department: dept.name, percentChange: pct };
      }),
      revenueOptions: Object.entries(revenueToggles).filter(([, v]) => v > 0).map(([id, v]) => {
        const rev = data.revenues.find((r) => r.id === id)!;
        return { revenue: rev.name, additionalRevenue: v };
      }),
      budgetGapRemaining: gap,
      timestamp: now,
    };
    try {
      await fetch("https://mcp-submissions.casper-studios.workers.dev/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "submit_project",
          input: { team_name: "SD Budget Voice", project_name: "SD Budget Voice",
                   submission_type: "user_preferences", data: preferences },
        }),
      });
    } catch { /* best-effort */ }
    setSubmitting(false);
    if (!submitted) setSection("submit");
    setSubmitted(true);
    setSubmittedAt(now);
  };

  // ── Derived / helpers (needs data) ──────────────────────────────────────────

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://sd-budget-voice.vercel.app";
  const cm = COUNCIL_MEMBERS[district] ?? null;
  const hasChoices = Object.values(sliders).some((v) => v !== 0) || revenueDelta > 0;
  const isPastDeadline = new Date() > SUBMISSION_DEADLINE;

  const handleGenerateLetter = async () => {
    if (!data) return;
    setGeneratingLetter(true);
    setLetterDraft("");
    const contractNotes: Record<string, string> = {
      police: "POA contract expires June 30, 2026 — MOU negotiation opens this spring",
      fire:   "IAFF Local 145 contract expires June 30, 2026 — MOU negotiation opens this spring",
    };
    const payload = {
      councilMember: cm?.name ?? "",
      district,
      topPriorities: topPriorities.map((id) => {
        const dept = data.departments.find((d) => d.id === id);
        if (dept) return { name: dept.name, type: "spending" as const };
        const rev = data.revenues.find((r) => r.id === id);
        return { name: rev?.name ?? id, type: "revenue" as const };
      }),
      increases: data.departments
        .filter((d) => sliders[d.id] > 0)
        .map((d) => ({ name: d.name, pct: sliders[d.id], dollars: Math.abs(d.fy26 * sliders[d.id] / 100) })),
      cuts: data.departments
        .filter((d) => sliders[d.id] < 0)
        .map((d) => ({
          name: d.name, pct: sliders[d.id],
          dollars: Math.abs(d.fy26 * sliders[d.id] / 100),
          contractNote: contractNotes[d.id],
        })),
      revenues: data.revenues
        .filter((r) => (revenueToggles[r.id] ?? 0) > 0)
        .map((r) => {
          const opt = r.options?.find((o) => o.value === revenueToggles[r.id]);
          return { label: opt?.label ?? r.name, amount: revenueToggles[r.id], requiresVote: r.requiresVoterApproval ?? false };
        }),
      comment: comments.trim() || undefined,
      residentName: residentName.trim() || undefined,
      appUrl,
    };
    try {
      const res = await fetch("/api/generate-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.body) throw new Error("API unavailable");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setLetterDraft((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      setLetterDraft(generateLetter(data, sliders, revenueToggles, district, topPriorities, appUrl));
    } finally {
      setGeneratingLetter(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letterDraft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen" style={{ background: "var(--background)" }}>

      {/* ── HEADER ── */}
      <header className="bg-[#FFFDF9] border-b border-stone-200 sticky top-0 z-30">
        {/* Progress bar */}
        <div className="h-0.5 bg-stone-100">
          <div
            className="h-full bg-teal-600 transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-0.5">
                Community Survey · San Diego FY2027
              </p>
              <h1 className="text-lg font-bold text-stone-900 leading-tight">
                Make your voice heard on the budget.
              </h1>
            </div>
            <span className="text-xs text-stone-500 font-medium bg-stone-100 px-2.5 py-1 rounded-full shrink-0">
              ⏱ ~3 min
            </span>
          </div>

          {/* Tab nav — desktop only (mobile uses bottom nav) */}
          <div className="hidden sm:flex gap-1 bg-stone-100 p-1 rounded-2xl">
            {NAV_ITEMS.map((item, i) => {
              const { Icon } = item;
              return (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                    section === item.key
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {item.key !== "results" ? `${i + 1}. ${item.label}` : item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ── */}
      <div className="max-w-2xl mx-auto px-5 py-8 pb-28 sm:pb-8 space-y-6">

        {/* ════ EXPLORE ════ */}
        {section === "explore" && (
          <div className="space-y-8">

            {/* Community identity banner */}
            <div className="bg-teal-700 rounded-3xl p-5">
              <p className="text-xs font-bold text-teal-200 uppercase tracking-widest mb-2">Built by residents · for residents</p>
              <p className="text-white font-bold text-base leading-snug mb-2">
                This is an independent community survey — not an official City of San Diego tool.
              </p>
              <p className="text-teal-100 text-sm leading-relaxed mb-4">
                Your priorities will be compiled and delivered directly to San Diego city council members and the mayor&apos;s office before the FY2027 budget is finalized. The more neighbors who participate, the stronger our collective voice.
              </p>
              <button
                onClick={() => setSection("tradeoffs")}
                className="inline-flex items-center gap-2 bg-white text-teal-800 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-teal-50 transition-colors shadow-sm"
              >
                Add my voice <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Deficit callout */}
            <div className="bg-[#FFFDF9] border border-stone-200 rounded-3xl p-6 shadow-sm">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
                The situation
              </p>
              <p className="text-4xl font-extrabold text-stone-900 mb-1">$120M shortfall</p>
              <p className="text-sm font-medium text-teal-700 mb-3">San Diego · FY2027 General Fund</p>
              <p className="text-base text-stone-600 leading-relaxed">
                San Diego must close a $120 million budget gap before July 2026.
                That means cutting services, raising revenue, or both.
                Use the real numbers to tell us where your priorities lie.
              </p>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
              <h2 className="text-lg font-bold text-stone-900 mb-1">
                Where does the money go?
              </h2>
              <p className="text-sm text-stone-500 mb-5">
                FY2026 General Fund spending by department.{" "}
                <a href="https://data.sandiego.gov/datasets/operating-budget/" target="_blank" rel="noopener noreferrer"
                   className="text-teal-600 underline">Data source.</a>
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} layout="vertical"
                  margin={{ left: 0, right: 40, top: 4, bottom: 4 }}>
                  <XAxis type="number" tickFormatter={(v) => `$${v}M`}
                    tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120}
                    tick={<WrappedYAxisTick />} axisLine={false} tickLine={false} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [`$${Number(v).toFixed(0)}M`, "FY26 Budget"]}
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0",
                      borderRadius: "12px", color: "#0f172a", fontSize: "13px",
                      boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)" }}
                  />
                  <Bar dataKey="fy26" radius={[0, 6, 6, 0]}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Key facts */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { num: "$2.67B", label: "Total General Fund", detail: "Funds police, fire, parks, libraries, streets, and more." },
                { num: "46%",    label: "Police & Fire alone", detail: "Nearly half the budget goes to public safety." },
                { num: "75–90%", label: "Of most budgets is people", detail: "Cuts almost always mean staff reductions or reduced hours." },
                { num: "$1,882", label: "Cost per resident/yr", detail: "What the city spends on average to run all services." },
              ].map((f) => (
                <div key={f.label} className="bg-white rounded-3xl border border-stone-200 shadow-sm p-4">
                  <p className="text-2xl font-extrabold text-teal-600 leading-tight mb-1">{f.num}</p>
                  <p className="font-bold text-stone-900 text-sm leading-snug">{f.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{f.detail}</p>
                </div>
              ))}
            </div>

            {/* Revenue sources — pie chart */}
            <RevenuePieChart />

            {/* Union contracts explainer — collapsible */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
              <h2 className="text-lg font-bold text-stone-900 mb-1">
                Why can&apos;t the city just cut what it wants?
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed mb-3">
                Most of the budget is people — salaries, benefits, pensions. Union contracts (MOUs) lock in pay and staffing rules, and all four major city MOUs expire June 30, 2026. That timing matters: what gets negotiated this spring will drive costs for years.
              </p>
              <Expandable label="See the full picture: contracts, civil service rules, and legal obligations">
                <div className="space-y-4 pt-1">
                  {[
                    {
                      icon: "📋",
                      title: "Union contracts (MOUs)",
                      body: "The city negotiates multi-year contracts with each employee union, locking in salaries, benefits, and layoff procedures. All four major MOUs expire June 30, 2026 — the exact day FY2027 begins.",
                    },
                    {
                      icon: "👷",
                      title: "Civil Service Rules protect workers",
                      body: "Even when layoffs are permitted, permanent employees can 'bump' into lower-level roles by seniority. Large-scale reductions are slow and legally complex — not achievable in one budget cycle.",
                    },
                    {
                      icon: "⚖️",
                      title: "Some costs are set by law",
                      body: "Pension debt and bond payments are constitutionally protected. Federal environmental permits also require minimum spending regardless of the budget situation.",
                    },
                    {
                      icon: "💡",
                      title: "What this means in the survey",
                      body: "Each spending card shows what union covers that department and what cut depth is realistically achievable by FY2027. You can still set any preference — ambitious signals matter to negotiators.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 pb-4 border-b border-stone-100 last:border-0 last:pb-0">
                      <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <p className="font-bold text-stone-900 text-sm mb-0.5">{item.title}</p>
                        <p className="text-sm text-stone-600 leading-relaxed">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Expandable>
            </div>

            {/* Budget timeline */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
              <h2 className="text-lg font-bold text-stone-900 mb-1">FY2027 Budget Timeline</h2>
              <p className="text-sm text-stone-500 mb-5">Key dates from now through the July 1 deadline.</p>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-stone-200" />
                <div className="space-y-5">
                  {[
                    {
                      date: "Now — Mar 2026",
                      status: "now",
                      title: "Community input period — you are here",
                      body: "This is the highest-leverage window to shape the proposed budget before it's drafted. This survey collects resident priorities and delivers them to council members and the mayor's office before April.",
                    },
                    {
                      date: "Apr 15, 2026",
                      status: "upcoming",
                      title: "Mayor releases proposed budget",
                      body: "The mayor publishes the full FY2027 proposed budget. This is the first public look at how the administration plans to close the $120M gap — what gets cut, what gets funded, what revenue is proposed.",
                    },
                    {
                      date: "Late Apr – May 2026",
                      status: "upcoming",
                      title: "City Council budget hearings",
                      body: "Each City Council committee holds public hearings on the proposed budget. Residents can testify in person or submit written comments. This is the most direct way to put your priorities on the record.",
                    },
                    {
                      date: "May – Jun 2026",
                      status: "upcoming",
                      title: "Union MOU negotiations",
                      body: "All four major city union contracts (including the Police Officers Association and IAFF firefighters) expire June 30, 2026. The terms negotiated now will determine personnel costs — the largest single driver of the structural deficit — for years to come.",
                    },
                    {
                      date: "Jun 2026",
                      status: "upcoming",
                      title: "City Council final vote",
                      body: "The full City Council votes on the final FY2027 budget. Amendments are possible up to this point. The vote must happen before June 30.",
                    },
                    {
                      date: "Jul 1, 2026",
                      status: "deadline",
                      title: "FY2027 begins",
                      body: "The new fiscal year starts. The budget is locked in. All spending, cuts, and any new revenue measures take effect.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-4 pl-10 relative">
                      <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 shrink-0 -translate-x-1/2 ${
                        item.status === "now"      ? "bg-teal-500 border-teal-600"
                        : item.status === "deadline" ? "bg-amber-400 border-amber-500"
                        :                             "bg-white border-stone-300"
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.status === "now"      ? "bg-teal-100 text-teal-700"
                            : item.status === "deadline" ? "bg-amber-100 text-amber-700"
                            :                             "bg-stone-100 text-stone-500"
                          }`}>{item.date}</span>
                        </div>
                        <p className="font-bold text-stone-900 text-base">{item.title}</p>
                        <p className="text-sm text-stone-600 leading-relaxed mt-0.5">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSection("tradeoffs")}
              className="w-full bg-teal-700 hover:bg-teal-600 text-white font-bold text-base py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              Add your voice — share your priorities <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ════ YOUR BUDGET ════ */}
        {section === "tradeoffs" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-stone-900 mb-1">Share your priorities</h2>
              <p className="text-base text-stone-600 leading-relaxed">
                There&apos;s no right answer — this is your budget too. Use the sliders to show where
                you&apos;d invest, where you&apos;d accept cuts, and what new revenue you&apos;d support.
                Aggregate results from this community survey will be delivered to council members
                and the mayor&apos;s office before the proposed budget is released in April.
              </p>
            </div>

            {/* District collection — needed for results filtering */}
            <div className="bg-white border border-stone-200 rounded-3xl shadow-sm p-5">
              <h3 className="font-bold text-stone-900 text-sm mb-3">Where in San Diego do you live?</h3>
              <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">ZIP Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={zipCode}
                    onChange={(e) => {
                      const z = e.target.value.replace(/\D/g, "").slice(0, 5);
                      setZipCode(z);
                      if (z.length === 5) {
                        const found = ZIP_TO_DISTRICT[z];
                        if (found) { setDistrict(found); setLetterDraft(""); }
                      }
                    }}
                    placeholder="e.g. 92103"
                    className="w-full border-2 border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:border-teal-500"
                  />
                  {zipCode.length === 5 && !ZIP_TO_DISTRICT[zipCode] && (
                    <p className="mt-1 text-xs text-amber-600">ZIP not found — select district manually.</p>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                    Council District
                    {district && <span className="ml-1.5 text-emerald-600">✓</span>}
                  </label>
                  <select
                    value={district}
                    onChange={(e) => { setDistrict(e.target.value); setLetterDraft(""); }}
                    className="w-full border-2 border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Select…</option>
                    {[1,2,3,4,5,6,7,8,9].map((d) => (
                      <option key={d} value={String(d)}>District {d} — {["LaCava","Campbell","Whitburn","Foster","von Wilpert","Lee","Campillo","Moreno","Elo-Rivera"][d-1]}</option>
                    ))}
                  </select>
                </div>
              </div>
              {district && (
                <p className="text-xs text-stone-400 mt-2">
                  Your responses will be grouped with other District {district} residents and reported in aggregate — individual responses are never shared.
                </p>
              )}
            </div>

            <GapMeter gap={gap} />

            {/* Sub-tab toggle */}
            <div className="flex gap-1 bg-stone-200 p-1 rounded-xl">
              {(["spending", "revenue"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBudgetSubTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all capitalize ${
                    budgetSubTab === tab
                      ? tab === "spending"
                        ? "bg-white text-teal-700 shadow-sm"
                        : "bg-white text-teal-700 shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {tab === "spending" ? "💰 Spending" : "📈 Revenue Options"}
                  {tab === "spending" && spendingDelta !== 0 && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      spendingDelta < 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                    }`}>
                      {spendingDelta > 0 ? "+" : ""}{fmtM(spendingDelta)}
                    </span>
                  )}
                  {tab === "revenue" && revenueDelta > 0 && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold bg-teal-100 text-teal-700">
                      +{fmtM(revenueDelta)}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── SPENDING TAB ── */}
            {budgetSubTab === "spending" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-stone-500">Drag sliders to show your preference — there&apos;s no wrong answer.</p>
                  {topPriorities.length > 0 && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ml-3 ${
                      topPriorities.length === 3 ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-700"
                    }`}>
                      ★ {topPriorities.length}/3 priorities
                    </span>
                  )}
                </div>

                <div className="space-y-5">
                  {data.departments.map((dept) => (
                    <SpendingCard
                      key={dept.id}
                      dept={dept}
                      value={sliders[dept.id] || 0}
                      onChange={(v) => setSliders((prev) => ({ ...prev, [dept.id]: v }))}
                      isPriority={topPriorities.includes(dept.id)}
                      canAddMore={topPriorities.length < 3}
                      onTogglePriority={() => setTopPriorities((prev) =>
                        prev.includes(dept.id)
                          ? prev.filter((id) => id !== dept.id)
                          : prev.length < 3 ? [...prev, dept.id] : prev
                      )}
                    />
                  ))}
                </div>

                {spendingDelta !== 0 && (
                  <div className={`rounded-xl px-5 py-4 text-base font-bold flex justify-between border-2 ${
                    spendingDelta < 0
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-red-50 text-red-600 border-red-300"
                  }`}>
                    <span>Your net spending change</span>
                    <span>{spendingDelta > 0 ? "+" : ""}{fmtM(spendingDelta)}</span>
                  </div>
                )}

                <button
                  onClick={() => setBudgetSubTab("revenue")}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  Next: explore revenue options <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── REVENUE TAB ── */}
            {budgetSubTab === "revenue" && (
              <div className="space-y-5">
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                  <p className="text-sm text-teal-800 leading-relaxed mb-2">
                    Some options require a <span className="font-semibold">voter ballot measure</span> — the Council can propose it but can&apos;t act alone. Others the <span className="font-semibold">Council can approve directly</span>, making them faster to implement.
                  </p>
                  <Expandable label="More: property tax limits, implementation timelines, and Prop 13">
                    <div className="space-y-3 pt-1">
                      {[
                        { icon: "⏱️", title: "New revenue takes time", body: "Even after approval, new taxes typically take 12–18 months to collect. Revenue rarely arrives in the same fiscal year it's approved." },
                        { icon: "🔒", title: "Property tax is fixed by state law", body: "Prop 13 caps property tax at 1% statewide. San Diego receives only ~17 cents per dollar — the rest goes to schools and the county. The city cannot raise this on its own." },
                      ].map((item) => (
                        <div key={item.title} className="flex gap-3">
                          <span className="text-lg shrink-0">{item.icon}</span>
                          <div>
                            <p className="text-sm font-semibold text-teal-900">{item.title}</p>
                            <p className="text-sm text-teal-800 leading-relaxed">{item.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Expandable>
                </div>

                <div className="space-y-5">
                  {data.revenues.map((rev) => (
                    <RevenueCard
                      key={rev.id}
                      rev={rev}
                      value={revenueToggles[rev.id] ?? 0}
                      onChange={(v) => setRevenueToggles((prev) => ({ ...prev, [rev.id]: v }))}
                      isPriority={topPriorities.includes(rev.id)}
                      canAddMore={topPriorities.length < 3}
                      onTogglePriority={() => setTopPriorities((prev) =>
                        prev.includes(rev.id)
                          ? prev.filter((id) => id !== rev.id)
                          : prev.length < 3 ? [...prev, rev.id] : prev
                      )}
                    />
                  ))}
                </div>

                {revenueDelta > 0 && (
                  <div className="rounded-xl px-5 py-4 text-base font-bold flex justify-between border-2 bg-teal-50 text-teal-700 border-teal-300">
                    <span>New revenue you&apos;d support</span>
                    <span>+{fmtM(revenueDelta)}/yr</span>
                  </div>
                )}
              </div>
            )}

            {/* Always-visible summary + CTA */}
            <div className="bg-white border border-stone-200 rounded-3xl shadow-sm p-5">
              <h3 className="font-bold text-stone-900 text-base mb-1">Your priorities so far</h3>
              <p className="text-xs text-stone-400 mb-4 leading-relaxed">
                The city has tools residents don&apos;t — contract negotiations, federal grants, bond financing, and multi-year phasing. Your input matters regardless of whether the numbers fully close the gap.
              </p>
              <div className="space-y-2 text-base">
                <div className="flex justify-between">
                  <span className="text-stone-600">Starting shortfall</span>
                  <span className="font-bold text-red-500">+$120M</span>
                </div>
                {spendingDelta !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">Spending {spendingDelta > 0 ? "increases" : "cuts"}</span>
                    <span className={`font-bold ${spendingDelta > 0 ? "text-red-500" : "text-emerald-600"}`}>
                      {spendingDelta > 0 ? "+" : ""}{fmtM(spendingDelta)}
                    </span>
                  </div>
                )}
                {revenueDelta > 0 && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">New revenue</span>
                    <span className="font-bold text-teal-600">−{fmtM(revenueDelta)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t-2 border-stone-100 pt-3 mt-2 text-lg">
                  <span className="text-stone-900">Gap remaining</span>
                  <span className={gap <= 0 ? "text-emerald-600" : gap < 30 ? "text-amber-600" : "text-red-500"}>
                    {gap <= 0 ? "Balanced ✓" : `+$${gap.toFixed(0)}M`}
                  </span>
                </div>
              </div>
            </div>

            {/* Comments — right before submit so choices are fresh */}
            <div className="bg-white border border-stone-200 rounded-3xl shadow-sm p-5 space-y-3">
              <div>
                <h3 className="font-bold text-stone-900 text-base mb-0.5">In your own words <span className="text-stone-400 font-normal text-sm">(optional)</span></h3>
                <p className="text-xs text-stone-400">Why do these choices matter to you? Context strengthens your input — and shapes your AI-generated letter if you write one.</p>
              </div>
              <div className="relative">
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value.slice(0, COMMENT_MAX))}
                  rows={3}
                  placeholder="e.g. The park in my neighborhood was the first thing cut and hasn't recovered. Homelessness in my area has doubled since outreach was reduced."
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-teal-500 resize-none leading-relaxed"
                />
                <span className={`absolute bottom-2.5 right-3 text-xs font-medium ${comments.length > COMMENT_MAX * 0.9 ? "text-amber-500" : "text-stone-300"}`}>
                  {comments.length}/{COMMENT_MAX}
                </span>
              </div>
            </div>

            {isPastDeadline ? (
              <div className="bg-stone-100 border border-stone-200 rounded-2xl px-5 py-4 text-center">
                <p className="font-semibold text-stone-600 text-sm">Submission period ended June 1, 2026.</p>
              </div>
            ) : !submitted ? (
              <div className="space-y-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !hasChoices}
                  className="w-full bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white font-bold text-base py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  {submitting ? "Recording…" : <><span>Submit my priorities</span><ArrowRight className="w-5 h-5" /></>}
                </button>
                <p className="text-xs text-stone-400 text-center">Saved automatically · Deadline <span className="font-semibold text-stone-500">June 1, 2026</span></p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-900">Voice recorded — thank you.</p>
                    <p className="text-sm text-emerald-700">
                      Submitted {submittedAt ? new Date(submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}.
                      {" "}Your priorities will be included in the report delivered to city officials. You can update any time before June 1.
                    </p>
                  </div>
                </div>
                {/* Share prompt */}
                <button
                  onClick={async () => {
                    const shareData = {
                      title: "SD Budget Voice",
                      text: "San Diego has a $120M budget gap to close by July 2026. I just shared my priorities — takes 3 minutes. Results go to city council members and the mayor's office.",
                      url: typeof window !== "undefined" ? window.location.href : "https://sd-budget-voice.vercel.app",
                    };
                    if (navigator.share) {
                      try { await navigator.share(shareData); } catch { /* user cancelled */ }
                    } else {
                      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                    }
                  }}
                  className="w-full bg-teal-700 hover:bg-teal-600 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  Share with your neighbors
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSection("results")}
                    className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    See community results <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {submitting ? "Updating…" : "Update my priorities"}
                  </button>
                </div>
                <button
                  onClick={() => setSection("submit")}
                  className="w-full text-teal-700 font-semibold text-sm py-2 flex items-center justify-center gap-1.5 hover:underline"
                >
                  Take Action <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════ TAKE ACTION ════ */}
        {section === "submit" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-stone-900 mb-1">Take Action</h2>
              <p className="text-base text-stone-600 leading-relaxed">
                Your survey response goes to city officials — but direct contact from constituents
                carries even more weight. Here&apos;s how to make your voice count before July 1.
              </p>
            </div>

            {/* ── 1. Write your council member ── */}
            <div className="bg-white border border-stone-200 rounded-3xl shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Highest impact</p>
                  <h3 className="font-bold text-stone-900 text-base leading-snug">Write your council member</h3>
                  <p className="text-xs text-stone-400 mt-0.5">AI-drafted from your budget choices. Edit before sending.</p>
                </div>
                {(letterDraft || generatingLetter) && (
                  <button
                    onClick={handleGenerateLetter}
                    disabled={generatingLetter || !hasChoices}
                    className="text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-40 border border-teal-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                  >
                    Regenerate
                  </button>
                )}
              </div>

              {/* Rep lookup — only ask if district not set */}
              {!district ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">Your ZIP Code</label>
                    <input
                      type="text" inputMode="numeric" maxLength={5} value={zipCode}
                      onChange={(e) => {
                        const z = e.target.value.replace(/\D/g, "").slice(0, 5);
                        setZipCode(z);
                        if (z.length === 5) {
                          const found = ZIP_TO_DISTRICT[z];
                          if (found) { setDistrict(found); setLetterDraft(""); }
                        }
                      }}
                      placeholder="e.g. 92103"
                      className="w-full border-2 border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-teal-500"
                    />
                    {zipCode.length === 5 && !ZIP_TO_DISTRICT[zipCode] && (
                      <p className="mt-1 text-xs text-amber-700">
                        ZIP not found —{" "}
                        <a href="https://www.sandiego.gov/citycouncil" target="_blank" rel="noopener noreferrer" className="underline">look up your district</a>.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">Council District</label>
                    <select
                      value={district}
                      onChange={(e) => { setDistrict(e.target.value); setLetterDraft(""); }}
                      className="w-full border-2 border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-teal-500"
                    >
                      <option value="">Select district…</option>
                      {[1,2,3,4,5,6,7,8,9].map((d) => (
                        <option key={d} value={String(d)}>District {d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : cm && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-0.5">Your representative</p>
                    <p className="font-bold text-teal-900">{cm.name} · District {district}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => { setDistrict(""); setLetterDraft(""); }} className="text-xs text-stone-400 hover:text-stone-600 underline">
                      Change
                    </button>
                    <a href={cm.contactUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold text-teal-700 underline flex items-center gap-1">
                      Contact page <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Name + generate */}
              {!letterDraft && !generatingLetter && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                      Your name <span className="font-normal text-stone-400">(optional — signs the letter)</span>
                    </label>
                    <input
                      type="text" value={residentName}
                      onChange={(e) => setResidentName(e.target.value.slice(0, 80))}
                      placeholder="e.g. Maria Hernandez"
                      className="w-full border-2 border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <button
                    onClick={handleGenerateLetter}
                    disabled={!hasChoices}
                    className="w-full bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    {!hasChoices ? "Set your priorities in Your Budget first" : "Draft my letter"}
                  </button>
                  {hasChoices && topPriorities.length > 0 && (
                    <p className="text-xs text-stone-400 text-center">
                      Your top {topPriorities.length === 1 ? "priority" : `${topPriorities.length} priorities`} will lead the letter.
                    </p>
                  )}
                </div>
              )}

              {/* Letter draft + send actions */}
              {(letterDraft || generatingLetter) && (
                <>
                  <div className="relative">
                    <textarea
                      value={letterDraft}
                      onChange={(e) => setLetterDraft(e.target.value)}
                      rows={12} readOnly={generatingLetter}
                      className={`w-full border border-stone-200 rounded-2xl px-4 py-3.5 text-sm text-stone-800 focus:outline-none focus:border-teal-400 resize-y leading-relaxed transition-colors ${
                        generatingLetter ? "bg-stone-50 text-stone-500" : "bg-white"
                      }`}
                    />
                    {generatingLetter && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-xs font-medium text-teal-700">Writing…</span>
                      </div>
                    )}
                  </div>
                  {!generatingLetter && letterDraft && (
                    <div className="space-y-2.5">
                      <button
                        onClick={handleCopy}
                        className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 px-5 rounded-xl text-base transition-colors ${
                          copied ? "bg-emerald-600 text-white" : "bg-teal-700 hover:bg-teal-600 text-white"
                        }`}
                      >
                        {copied ? <><Check className="w-5 h-5" /> Copied!</> : <><Copy className="w-5 h-5" /> Copy letter to clipboard</>}
                      </button>
                      {cm && (
                        <a href={cm.contactUrl} target="_blank" rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 px-5 rounded-xl text-base border-2 border-teal-300 text-teal-700 hover:bg-teal-50 transition-colors"
                        >
                          <ExternalLink className="w-5 h-5" /> Open {cm.name}&apos;s contact form
                        </a>
                      )}
                      {cm?.email && (
                        <a
                          href={`mailto:${cm.email}?subject=FY2027 Budget Priorities — District ${district} Resident&body=${encodeURIComponent(letterDraft)}`}
                          className="w-full flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-xl text-sm border-2 border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors"
                        >
                          <Mail className="w-4 h-4" /> Email {cm.name} directly
                        </a>
                      )}
                      <p className="text-xs text-stone-400 text-center">
                        Copy → open contact form → paste into the message field (⌘V / Ctrl+V).
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── 2. Testify at hearings ── */}
            <div className="bg-white border border-stone-200 rounded-3xl shadow-sm p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl shrink-0 mt-0.5">🎤</span>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-0.5">Est. May 12–21, 2026</p>
                  <h3 className="font-bold text-stone-900 text-base">Testify at City Council budget hearings</h3>
                </div>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed mb-4">
                Every May, the Budget &amp; Government Efficiency Committee holds public hearings — and any resident can sign up to speak. You get 2 minutes on the official record, in front of the council members who vote on the final budget. You can also submit written comments if you can&apos;t attend in person. Confirmed dates are posted 1–2 weeks before on the City Clerk&apos;s calendar.
              </p>
              <a href="https://www.sandiego.gov/city-clerk/officialdocs/council-agendas" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 underline">
                City Clerk agenda calendar <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* ── 3. Stay informed ── */}
            <div className="bg-white border border-stone-200 rounded-3xl shadow-sm p-5">
              <h3 className="font-bold text-stone-900 text-base mb-0.5">Get notified at key moments</h3>
              <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                We&apos;ll reach out when the proposed budget drops (~Apr 14), when hearing dates are confirmed, and before the final vote. Enter one or both — your choice.
              </p>
              {smsSignedUp ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-800">
                    You&apos;re signed up{phoneNumber && emailAddress ? ` — we&apos;ll reach you at ${emailAddress} and ${phoneNumber}` : phoneNumber ? ` — we&apos;ll text ${phoneNumber}` : emailAddress ? ` — we&apos;ll email ${emailAddress}` : ""}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 mb-1.5">Email address</label>
                      <input
                        type="email" value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full border-2 border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 mb-1.5">Phone (text / SMS)</label>
                      <input
                        type="tel" value={phoneNumber}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                          const fmt = digits.length >= 7
                            ? `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
                            : digits.length >= 4
                            ? `(${digits.slice(0,3)}) ${digits.slice(3)}`
                            : digits.length >= 1
                            ? `(${digits}`
                            : "";
                          setPhoneNumber(fmt);
                        }}
                        placeholder="(619) 555-0100"
                        className="w-full border-2 border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const digits = phoneNumber.replace(/\D/g, "");
                      const hasEmail = emailAddress.includes("@");
                      const hasPhone = digits.length === 10;
                      if (!hasEmail && !hasPhone) return;
                      setSmsSigningUp(true);
                      try {
                        await fetch("https://mcp-submissions.casper-studios.workers.dev/mcp", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            tool: "submit_project",
                            input: {
                              team_name: "SD Budget Voice",
                              project_name: "SD Budget Voice",
                              submission_type: "alert_signup",
                              data: {
                                email: hasEmail ? emailAddress.trim() : undefined,
                                phone: hasPhone ? digits : undefined,
                                district, zipCode, submissionId,
                                residentName: residentName.trim() || undefined,
                              },
                            },
                          }),
                        });
                      } catch { /* best-effort */ }
                      setSmsSigningUp(false);
                      setSmsSignedUp(true);
                    }}
                    disabled={smsSigningUp || (!emailAddress.includes("@") && phoneNumber.replace(/\D/g, "").length !== 10)}
                    className="w-full bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                  >
                    {smsSigningUp ? "Saving…" : "Notify me"}
                  </button>
                  <p className="text-xs text-stone-400">US phone numbers only. Standard message rates apply. One alert per milestone.</p>
                </div>
              )}
            </div>

            {/* ── 4. What's coming ── */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
              <h3 className="font-bold text-stone-900 text-base mb-4">What&apos;s coming</h3>
              <div className="relative">
                <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-stone-200" />
                <div className="space-y-5">
                  {[
                    {
                      date: "~Apr 14",
                      label: "Proposed budget released",
                      body: "Mayor publishes the full FY2027 budget. Download your district's section and flag cuts to services you use.",
                      url: "https://www.sandiego.gov/finance/budget",
                      urlLabel: "City budget page",
                      urgent: false,
                    },
                    {
                      date: "May 12–21",
                      label: "Public hearings",
                      body: "Sign up to testify or submit written comments. Two minutes on the record in front of the council.",
                      url: "https://www.sandiego.gov/city-clerk/officialdocs/council-agendas",
                      urlLabel: "Clerk's agenda calendar",
                      urgent: false,
                    },
                    {
                      date: "May – Jun",
                      label: "District community meetings",
                      body: cm
                        ? `Watch ${cm.name}'s website for a district budget meeting — dates posted 1–2 weeks out.`
                        : "Watch your council member's website for community budget meetings — dates vary by district.",
                      url: cm ? `https://www.sandiego.gov/citycouncil/cd${district}` : "https://www.sandiego.gov/citycouncil",
                      urlLabel: cm ? `${cm.name}'s page` : "Council member pages",
                      urgent: false,
                    },
                    {
                      date: "~Jun 8",
                      label: "Final vote — call now",
                      body: "Council votes on the budget. A direct call to your rep's office the week before is the last high-leverage moment. Ask staff to log your position on specific programs.",
                      url: cm ? cm.contactUrl : "https://www.sandiego.gov/citycouncil",
                      urlLabel: cm ? `${cm.name}'s office` : "Find your rep",
                      urgent: true,
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-4 pl-9 relative">
                      <div className={`absolute left-2 top-1.5 w-3 h-3 rounded-full border-2 shrink-0 -translate-x-1/2 ${
                        item.urgent ? "bg-amber-400 border-amber-500" : "bg-white border-stone-300"
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.urgent ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"
                          }`}>{item.date}</span>
                          <p className={`font-bold text-sm ${item.urgent ? "text-amber-900" : "text-stone-900"}`}>{item.label}</p>
                        </div>
                        <p className={`text-sm leading-relaxed mb-1.5 ${item.urgent ? "text-amber-800" : "text-stone-500"}`}>{item.body}</p>
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-xs font-semibold underline ${
                            item.urgent ? "text-amber-700" : "text-teal-600"
                          }`}>
                          {item.urlLabel} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ RESULTS ════ */}
        {section === "results" && <ResultsSection data={data} userComment={comments} hasSubmitted={submitted} />}

        {/* Footer */}
        <div className="border-t border-stone-200 pt-6 text-center space-y-1">
          <p className="text-sm font-semibold text-stone-500">SD Budget Voice · A community input tool</p>
          <p className="text-xs text-stone-400">
            Not an official City of San Diego survey. Results delivered to council members and the mayor&apos;s office.
            Budget data via{" "}
            <a href="https://data.sandiego.gov" className="underline hover:text-stone-600"
              target="_blank" rel="noopener noreferrer">data.sandiego.gov</a>.
          </p>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 flex safe-area-inset-bottom">
        {NAV_ITEMS.map((item) => {
          const { Icon } = item;
          const active = section === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                active ? "text-teal-700" : "text-stone-400"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-semibold tracking-wide">{item.short}</span>
              {active && <span className="absolute bottom-0 w-8 h-0.5 bg-teal-600 rounded-full" />}
            </button>
          );
        })}
      </nav>
    </main>
  );
}
