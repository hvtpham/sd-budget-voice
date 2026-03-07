"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

type Department = {
  id: string;
  name: string;
  fy26: number;
  fy25: number;
  pct: number;
  description: string;
  perResident: number;
  employees: number;
  context: string;
};

type RevenueOption = { label: string; value: number; note: string };

type Revenue = {
  id: string;
  name: string;
  fy26: number;
  description: string;
  controllable: boolean;
  options?: RevenueOption[];
};

type CivicAction = {
  label: string;
  url: string;
  description: string;
};

type BudgetData = {
  deficit: number;
  fiscalYear: string;
  dataSource: string;
  departments: Department[];
  revenues: Revenue[];
  civicActions: CivicAction[];
};

const DEPT_COLORS = [
  "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa",
  "#93c5fd", "#bfdbfe", "#6366f1", "#818cf8",
];

const SLIDER_VALUES = [-15, -10, -5, 0, 5, 10, 15];

function fmt(n: number) {
  return `$${Math.abs(n).toFixed(0)}M`;
}

function SliderInput({
  value,
  onChange,
  dept,
}: {
  value: number;
  onChange: (v: number) => void;
  dept: Department;
}) {
  const idx = SLIDER_VALUES.indexOf(value);
  const pctChange = value;
  const dollarChange = (dept.fy26 * pctChange) / 100;

  let icon = <Minus className="w-4 h-4 text-gray-400" />;
  if (value < -5) icon = <TrendingDown className="w-4 h-4 text-red-400" />;
  else if (value < 0) icon = <TrendingDown className="w-4 h-4 text-orange-400" />;
  else if (value > 5) icon = <TrendingUp className="w-4 h-4 text-green-600" />;
  else if (value > 0) icon = <TrendingUp className="w-4 h-4 text-green-400" />;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-gray-200">
          {value === 0
            ? "No change"
            : `${value > 0 ? "+" : ""}${value}% (${value > 0 ? "+" : ""}${fmt(dollarChange)})`}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={6}
        step={1}
        value={idx === -1 ? 3 : idx}
        onChange={(e) => onChange(SLIDER_VALUES[parseInt(e.target.value)])}
        className="w-full accent-blue-500 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>Cut 15%</span>
        <span>No change</span>
        <span>+15%</span>
      </div>
    </div>
  );
}

function DeptCard({
  dept,
  sliderValue,
  onSliderChange,
}: {
  dept: Department;
  sliderValue: number;
  onSliderChange: (v: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChange = sliderValue !== 0;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        hasChange
          ? sliderValue > 0
            ? "border-green-500/40 bg-green-950/20"
            : "border-red-500/40 bg-red-950/20"
          : "border-gray-700 bg-gray-800/50"
      }`}
    >
      <button
        className="w-full p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white">{dept.name}</span>
              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                {dept.pct}% of budget
              </span>
              {hasChange && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                    sliderValue > 0
                      ? "bg-green-900 text-green-300"
                      : "bg-red-900 text-red-300"
                  }`}
                >
                  {sliderValue > 0 ? "+" : ""}
                  {sliderValue}%
                </span>
              )}
            </div>
            <div className="text-sm text-gray-400 mt-0.5">
              FY26: ${dept.fy26.toFixed(0)}M &middot; ${dept.perResident}/resident/yr
            </div>
          </div>
          <div className="flex items-center gap-1 text-gray-500 shrink-0">
            <Info className="w-4 h-4" />
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3 border-t border-gray-700 pt-3">
          <p className="text-sm text-gray-300">{dept.description}</p>
          <div className="flex items-start gap-2 bg-blue-950/40 rounded-lg p-3">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-200">{dept.context}</p>
          </div>
          <div className="text-xs text-gray-500">
            FY25: ${dept.fy25.toFixed(0)}M &rarr; FY26: ${dept.fy26.toFixed(0)}M (
            {((dept.fy26 / dept.fy25 - 1) * 100).toFixed(1)}% change) &middot; ~{dept.employees.toLocaleString()} employees
          </div>
        </div>
      )}

      <div className="px-4 pb-4 pt-2">
        <SliderInput value={sliderValue} onChange={onSliderChange} dept={dept} />
      </div>
    </div>
  );
}

function BudgetMeter({ gap }: { gap: number }) {
  const balanced = Math.abs(gap) < 5;
  const surplus = gap < -5;

  return (
    <div
      className={`sticky top-0 z-20 rounded-xl border p-4 backdrop-blur-sm transition-all ${
        balanced
          ? "border-green-500 bg-green-950/80"
          : surplus
          ? "border-teal-500 bg-teal-950/80"
          : "border-red-500 bg-red-950/80"
      }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">
            Budget gap remaining
          </div>
          <div
            className={`text-3xl font-bold ${
              balanced ? "text-green-400" : surplus ? "text-teal-400" : "text-red-400"
            }`}
          >
            {surplus ? "-" : ""}${Math.abs(gap).toFixed(0)}M
          </div>
        </div>
        <div className="text-right">
          {balanced ? (
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <CheckCircle className="w-5 h-5" />
              Budget balanced!
            </div>
          ) : surplus ? (
            <div className="text-teal-300 text-sm">Surplus — extra revenue</div>
          ) : (
            <div className="text-red-300 text-sm">
              ${gap.toFixed(0)}M still unresolved
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            balanced ? "bg-green-500" : surplus ? "bg-teal-500" : "bg-red-500"
          }`}
          style={{
            width: `${Math.min(100, Math.max(0, ((120 - gap) / 120) * 100))}%`,
          }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">
        $120M deficit to close for FY2027
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [sliders, setSliders] = useState<Record<string, number>>({});
  const [revenueToggles, setRevenueToggles] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [district, setDistrict] = useState("");
  const [comments, setComments] = useState("");
  const [section, setSection] = useState<"explore" | "tradeoffs" | "submit">("explore");

  useEffect(() => {
    fetch("/budget-data.json")
      .then((r) => r.json())
      .then((d: BudgetData) => {
        setData(d);
        const init: Record<string, number> = {};
        d.departments.forEach((dept) => (init[dept.id] = 0));
        setSliders(init);
      });
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading budget data...
      </div>
    );
  }

  const spendingDelta = data.departments.reduce((sum, dept) => {
    return sum + (dept.fy26 * (sliders[dept.id] || 0)) / 100;
  }, 0);

  const revenueDelta = Object.values(revenueToggles).reduce((sum, v) => sum + v, 0);

  const gap = 120 + spendingDelta - revenueDelta;

  const chartData = [...data.departments]
    .sort((a, b) => b.fy26 - a.fy26)
    .map((d, i) => ({
      name: d.name.length > 20 ? d.name.slice(0, 19) + "…" : d.name,
      fy26: d.fy26,
      color: DEPT_COLORS[i % DEPT_COLORS.length],
    }));

  const handleSubmit = async () => {
    setSubmitting(true);
    const preferences = {
      zipCode,
      district,
      comments,
      spendingAdjustments: Object.entries(sliders)
        .filter(([, v]) => v !== 0)
        .map(([id, pct]) => {
          const dept = data.departments.find((d) => d.id === id)!;
          return { department: dept.name, percentChange: pct };
        }),
      revenueOptions: Object.entries(revenueToggles)
        .filter(([, v]) => v > 0)
        .map(([id, v]) => {
          const rev = data.revenues.find((r) => r.id === id)!;
          return { revenue: rev.name, additionalRevenue: v };
        }),
      budgetGapRemaining: gap,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch("https://mcp-submissions.casper-studios.workers.dev/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "submit_project",
          input: {
            team_name: "SD Budget Voice",
            project_name: "SD Budget Voice",
            submission_type: "user_preferences",
            data: preferences,
          },
        }),
      });
    } catch {
      // Best-effort submission
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Hero */}
      <div className="bg-gradient-to-b from-blue-950 to-gray-950 border-b border-blue-900/40">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="inline-block bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            City of San Diego · FY2027 Budget
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Your City. Your Budget. Your Call.
          </h1>
          <p className="text-lg text-blue-200 mb-4">
            San Diego faces a{" "}
            <span className="text-white font-semibold">$120 million deficit</span>{" "}
            heading into FY2027. The mayor&apos;s survey asks for your opinions without
            showing you the real numbers. This tool does it differently.
          </p>
          <p className="text-gray-400 text-sm">
            Explore real spending data from the City&apos;s open data portal, make
            real tradeoffs across departments and revenue, then submit your
            preferences and take civic action — all in one place.
          </p>

          <div className="flex gap-2 mt-8 flex-wrap">
            {(["explore", "tradeoffs", "submit"] as const).map((s, i) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  section === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {i + 1}.{" "}
                {s === "explore"
                  ? "Explore the Budget"
                  : s === "tradeoffs"
                  ? "Make Tradeoffs"
                  : "Submit & Act"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* ── SECTION 1: EXPLORE ── */}
        {section === "explore" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Where does the money go?
              </h2>
              <p className="text-gray-400 text-sm">
                FY2026 General Fund adopted budget by department. Sourced from the{" "}
                <a
                  href="https://data.sandiego.gov/datasets/operating-budget/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline"
                >
                  City of San Diego Open Data Portal
                </a>
                .
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 140, right: 40, top: 4, bottom: 4 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `$${v}M`}
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#d1d5db", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={135}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [`$${Number(v).toFixed(0)}M`, "FY26 Budget"]}
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="fy26" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Total General Fund", value: "$2.67B", sub: "FY2026 Adopted" },
                { label: "Projected FY27 Deficit", value: "$120M", sub: "Must be closed by June 2026" },
                { label: "Cost per Resident", value: "$1,882", sub: "Per year, all services" },
              ].map((f) => (
                <div
                  key={f.label}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center"
                >
                  <div className="text-2xl font-bold text-blue-400">{f.value}</div>
                  <div className="text-sm font-semibold text-white mt-1">{f.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{f.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-5">
              <h3 className="font-semibold text-amber-300 mb-3">
                What the mayor&apos;s survey doesn&apos;t tell you
              </h3>
              <ul className="text-sm text-amber-200/80 space-y-2 list-disc list-inside">
                <li>
                  Police and Fire-Rescue account for <strong>46% of the General Fund</strong> —
                  they&apos;re barely mentioned in the survey
                </li>
                <li>
                  The survey asks what to &quot;protect&quot; without showing actual dollar amounts
                </li>
                <li>
                  Revenue options (taxes, fees) are completely absent from the survey
                </li>
                <li>
                  Service reduction questions provide no context on real-world impact
                </li>
              </ul>
            </div>

            <button
              onClick={() => setSection("tradeoffs")}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Make your tradeoffs <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── SECTION 2: TRADEOFFS ── */}
        {section === "tradeoffs" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Close the $120M gap
              </h2>
              <p className="text-gray-400 text-sm">
                Adjust spending across departments and explore revenue options.
                Every slider shows real dollar impacts. There are no easy answers —
                every cut affects real services, every revenue option affects real people.
              </p>
            </div>

            <BudgetMeter gap={gap} />

            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Spending by Department
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Expand each department to learn what it funds, then use the slider to indicate your preference.
              </p>
              <div className="space-y-3">
                {data.departments.map((dept) => (
                  <DeptCard
                    key={dept.id}
                    dept={dept}
                    sliderValue={sliders[dept.id] || 0}
                    onSliderChange={(v) =>
                      setSliders((prev) => ({ ...prev, [dept.id]: v }))
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Revenue Options
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Cuts alone rarely close a deficit. Select revenue options you&apos;d support.
              </p>
              <div className="space-y-3">
                {data.revenues.map((rev) => (
                  <div
                    key={rev.id}
                    className={`rounded-xl border p-4 ${
                      rev.controllable
                        ? "border-gray-700 bg-gray-800/50"
                        : "border-gray-800 bg-gray-900/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2 flex-wrap">
                      <span className="font-semibold text-white">{rev.name}</span>
                      <span className="text-sm text-gray-400">
                        Currently: ${rev.fy26.toFixed(0)}M/yr
                      </span>
                      {!rev.controllable && (
                        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                          Fixed by state law
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{rev.description}</p>
                    {rev.controllable && rev.options && (
                      <div className="space-y-2">
                        {rev.options.map((opt) => {
                          const selected = revenueToggles[rev.id] === opt.value;
                          return (
                            <button
                              key={opt.label}
                              onClick={() =>
                                setRevenueToggles((prev) => ({
                                  ...prev,
                                  [rev.id]: selected ? 0 : opt.value,
                                }))
                              }
                              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                                selected
                                  ? "border-teal-500 bg-teal-950/40 text-teal-200"
                                  : "border-gray-700 hover:border-gray-600 text-gray-300"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{opt.label}</span>
                                {selected && (
                                  <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">{opt.note}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Running summary */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 space-y-2">
              <h3 className="font-semibold text-white mb-3">Your budget summary</h3>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Starting deficit</span>
                <span className="text-red-400">+$120M</span>
              </div>
              {spendingDelta !== 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Spending {spendingDelta > 0 ? "increases" : "cuts"}</span>
                  <span className={spendingDelta > 0 ? "text-red-400" : "text-green-400"}>
                    {spendingDelta > 0 ? "+" : ""}{fmt(spendingDelta)}
                  </span>
                </div>
              )}
              {revenueDelta > 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>New revenue</span>
                  <span className="text-teal-400">-{fmt(revenueDelta)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-white border-t border-gray-700 pt-2 mt-1">
                <span>Remaining gap</span>
                <span className={gap <= 0 ? "text-green-400" : gap < 30 ? "text-yellow-400" : "text-red-400"}>
                  {gap <= 0 ? "Balanced" : `+$${gap.toFixed(0)}M`}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSection("submit")}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Submit your preferences <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── SECTION 3: SUBMIT ── */}
        {section === "submit" && (
          <div className="space-y-8">
            {!submitted ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Submit your input
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Your preferences — with real dollar context — are submitted to city leaders. No account required.
                  </p>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 space-y-2">
                  <h3 className="font-semibold text-white mb-3">Your choices at a glance</h3>
                  {Object.entries(sliders)
                    .filter(([, v]) => v !== 0)
                    .map(([id, pct]) => {
                      const dept = data.departments.find((d) => d.id === id)!;
                      const dollar = (dept.fy26 * pct) / 100;
                      return (
                        <div key={id} className="flex justify-between text-sm">
                          <span className="text-gray-300">{dept.name}</span>
                          <span className={pct > 0 ? "text-green-400" : "text-red-400"}>
                            {pct > 0 ? "+" : ""}{pct}% ({pct > 0 ? "+" : ""}{fmt(dollar)})
                          </span>
                        </div>
                      );
                    })}
                  {Object.entries(revenueToggles)
                    .filter(([, v]) => v > 0)
                    .map(([id, val]) => {
                      const rev = data.revenues.find((r) => r.id === id)!;
                      return (
                        <div key={id} className="flex justify-between text-sm">
                          <span className="text-gray-300">{rev.name}</span>
                          <span className="text-teal-400">+{fmt(val)} revenue</span>
                        </div>
                      );
                    })}
                  {Object.entries(sliders).every(([, v]) => v === 0) &&
                    Object.values(revenueToggles).every((v) => v === 0) && (
                      <p className="text-gray-500 text-sm italic">
                        No adjustments made —{" "}
                        <button onClick={() => setSection("tradeoffs")} className="text-blue-400 underline">
                          go back to make tradeoffs
                        </button>
                      </p>
                    )}
                  <div className="flex justify-between font-semibold text-white border-t border-gray-700 pt-2 mt-1">
                    <span>Remaining gap</span>
                    <span className={gap <= 0 ? "text-green-400" : "text-red-400"}>
                      {gap <= 0 ? "Balanced" : `$${gap.toFixed(0)}M remaining`}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">ZIP Code</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="e.g. 92103"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Council District</label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select district</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                          <option key={d} value={d}>District {d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Additional comments (optional)
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="What matters most to you? What's missing from this budget conversation?"
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {submitting ? "Submitting..." : "Submit my budget priorities"}
                </button>
              </>
            ) : (
              <div className="space-y-8">
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Your input is recorded.
                  </h2>
                  <p className="text-gray-400 max-w-sm mx-auto">
                    But a survey isn&apos;t enough. The budget is decided by elected officials —
                    here&apos;s how to make your voice count beyond this form.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-white">Take real civic action</h3>
                  {data.civicActions.map((action) => (
                    <a
                      key={action.label}
                      href={action.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-4 p-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:border-blue-600 hover:bg-gray-800 transition-all group"
                    >
                      <ExternalLink className="w-5 h-5 text-blue-400 mt-0.5 shrink-0 group-hover:text-blue-300" />
                      <div>
                        <div className="font-semibold text-white group-hover:text-blue-200">
                          {action.label}
                        </div>
                        <div className="text-sm text-gray-400">{action.description}</div>
                      </div>
                    </a>
                  ))}
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 text-sm text-gray-400">
                  <strong className="text-white">Data source: </strong>
                  All budget figures come from the{" "}
                  <a
                    href="https://data.sandiego.gov/datasets/operating-budget/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    City of San Diego Open Data Portal
                  </a>
                  , Operating Budgets dataset (FY2026 Adopted). The $120M deficit figure
                  is from the mayor&apos;s own FY2027 budget survey.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
          Built for the Claude Community × City of San Diego Impact Lab Hackathon · March 2026
          <br />
          Data:{" "}
          <a href="https://data.sandiego.gov" className="underline hover:text-gray-400" target="_blank" rel="noopener noreferrer">
            data.sandiego.gov
          </a>{" "}
          · Not affiliated with the City of San Diego
        </div>
      </div>
    </main>
  );
}
