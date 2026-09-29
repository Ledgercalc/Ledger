import { Readout, StatChip } from "../components/ui.jsx";
import { COMING_SOON_FIRMS, PROP_FIRMS } from "../data/propFirms.js";
import { num } from "../lib/format.js";
import { TAP, display, mono, palette } from "../lib/theme.js";
import { ArrowLeftRight, Building2, ChevronLeft, ChevronRight, Filter, Search, X } from "lucide-react";

export default function PropFirmTab(props) {
  const {
    applyPropFirmToChallenge,
    linkedFirm,
    pfCompareIds,
    pfCompareMode,
    pfFilterDdMode,
    pfFilterInstant,
    pfFilterPanelOpen,
    pfFilterPhases,
    pfFirmId,
    pfMarketType,
    pfPhaseIdx,
    pfPlanId,
    pfSearch,
    pfSizeAmount,
    pfSortBy,
    resetPropFirmWizard,
    setPfCompareIds,
    setPfCompareMode,
    setPfFilterDdMode,
    setPfFilterInstant,
    setPfFilterPanelOpen,
    setPfFilterPhases,
    setPfFirmId,
    setPfMarketType,
    setPfPhaseIdx,
    setPfPlanId,
    setPfSearch,
    setPfSizeAmount,
    setPfSortBy
  } = props;
  let body = null;
    const firm = PROP_FIRMS.find((f) => f.id === pfFirmId);
    const plan = firm?.plans.find((p) => p.id === pfPlanId);
    const size = plan?.sizes.find((s) => s.amount === pfSizeAmount);
    const phase = plan?.phases[pfPhaseIdx] || plan?.phases[0];

    const crumbBack = (label, onClick) => (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1 mb-4 ${TAP}`}
        style={{ color: palette.textMuted, fontSize: "12px", fontFamily: mono }}
      >
        <ChevronLeft size={16} />
        {label}
      </button>
    );

    if (!firm) {
      const q = pfSearch.trim().toLowerCase();
      const filtersActive =
        !!pfSortBy || pfFilterDdMode !== "all" || pfFilterInstant !== "all" || pfFilterPhases !== "all";

      const planMatchesFilters = (p) => {
        if (pfFilterDdMode !== "all" && p.phases[0].ddMode !== pfFilterDdMode) return false;
        const isInstant = p.phases[0].targetPct === "instant";
        if (pfFilterInstant === "instant" && !isInstant) return false;
        if (pfFilterInstant === "evaluation" && isInstant) return false;
        if (pfFilterPhases !== "all" && String(p.phases.length) !== pfFilterPhases) return false;
        return true;
      };

const filteredFirms = PROP_FIRMS.filter((f) => {
  const isFuturesFirm = f.id === "lucidtrading";

  const matchesMarket =
    pfMarketType === "all" ||
    (pfMarketType === "futures" && isFuturesFirm) ||
    (pfMarketType === "cfd" && !isFuturesFirm);

  if (!matchesMarket) return false;

  const matchesSearch =
    !q ||
    f.name.toLowerCase().includes(q) ||
    f.plans.some((p) => p.label.toLowerCase().includes(q));

  if (!matchesSearch) return false;
  if (filtersActive && !f.plans.some(planMatchesFilters)) return false;

  return true;
});
      const pfFilterChip = (active, label, onClick) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
          style={{
            background: active ? palette.gold : palette.field,
            color: active ? palette.letterbox : palette.textMuted,
            border: `1px solid ${active ? palette.gold : palette.border}`,
            fontFamily: mono,
            fontSize: "12px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {label}
        </button>
      );

      body = (
        <>
          <Readout
            icon={Building2}
            eyebrow="Prop Firm"
            value={String(PROP_FIRMS.length)}
            unit={PROP_FIRMS.length === 1 ? "firm mapped" : "firms mapped"}
            sub="Pick a firm to see its evaluation rules and drop them straight into the Challenge calculator."
          />

          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex items-center rounded-lg px-3 flex-1"
              style={{ background: palette.field, border: `1px solid ${palette.border}` }}
            >
              <Search size={14} style={{ color: palette.textFaint, flexShrink: 0 }} />
              <input
                type="text"
                value={pfSearch}
                onChange={(e) => setPfSearch(e.target.value)}
                placeholder="Search firm or plan name"
                className="w-full bg-transparent py-2.5 px-2 outline-none"
                style={{ color: palette.text, fontSize: "14px" }}
              />
              {pfSearch && (
                <button
                  type="button"
                  onClick={() => setPfSearch("")}
                  className={TAP}
                  style={{ color: palette.textFaint }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPfFilterPanelOpen((v) => !v)}
              className={`relative flex items-center justify-center rounded-lg flex-shrink-0 ${TAP}`}
              style={{
                width: "42px",
                height: "42px",
                background: pfFilterPanelOpen || filtersActive ? palette.gold : palette.field,
                border: `1px solid ${pfFilterPanelOpen || filtersActive ? palette.gold : palette.border}`,
                color: pfFilterPanelOpen || filtersActive ? palette.letterbox : palette.textMuted,
              }}
              aria-label="Toggle sort & filter options"
            >
              <Filter size={16} />
              {filtersActive && !pfFilterPanelOpen && (
                <span
                  style={{
                    position: "absolute",
                    top: "-3px",
                    right: "-3px",
                    width: "9px",
                    height: "9px",
                    borderRadius: "999px",
                    background: palette.red,
                    border: `1.5px solid ${palette.surface}`,
                  }}
                />
              )}
            </button>
          </div>

          {pfFilterPanelOpen && (
            <div
              className="rounded-2xl p-3.5 mb-4"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span
                  style={{
                    fontFamily: display,
                    fontSize: "12px",
                    fontWeight: 700,
                    color: palette.text,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                  }}
                >
                  Sort &amp; Filter
                </span>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setPfSortBy(null);
                      setPfFilterDdMode("all");
                      setPfFilterInstant("all");
                      setPfFilterPhases("all");
                    }}
                    className={TAP}
                    style={{
                      color: palette.textFaint,
                      fontSize: "11px",
                      fontFamily: mono,
                      textDecoration: "underline",
                      textUnderlineOffset: "2px",
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <span
                className="block mb-1.5 uppercase"
                style={{ color: palette.textFaint, letterSpacing: "0.07em", fontSize: "10px", fontWeight: 600 }}
              >
                Sort By
              </span>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {[
                  { id: "split", label: "Profit Split" },
                  { id: "risk", label: "Max Risk" },
                  { id: "drawdown", label: "Drawdown %" },
                  { id: "dailyLoss", label: "Daily Loss %" },
                  { id: "consistency", label: "Consistency" },
                  { id: "target", label: "Target %" },
                  { id: "minDayGain", label: "Min Day Gain" },
                  { id: "size", label: "Cheapest Size" },
                  { id: "funded", label: "Fastest Funded" },
                ].map((opt) =>
                  pfFilterChip(pfSortBy === opt.id, opt.label, () =>
                    setPfSortBy(pfSortBy === opt.id ? null : opt.id)
                  )
                )}
              </div>

              <div style={{ height: "1px", background: palette.border, margin: "10px 0" }} />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span
                    className="block mb-1.5 uppercase"
                    style={{ color: palette.textFaint, letterSpacing: "0.07em", fontSize: "10px", fontWeight: 600 }}
                  >
                    Drawdown
                  </span>
                  <div className="flex flex-col gap-1.5 items-start">
                    {pfFilterChip(pfFilterDdMode === "all", "Any", () => setPfFilterDdMode("all"))}
                    {pfFilterChip(pfFilterDdMode === "static", "Static", () => setPfFilterDdMode("static"))}
                    {pfFilterChip(pfFilterDdMode === "trail", "Trailing", () => setPfFilterDdMode("trail"))}
                  </div>
                </div>

                <div>
                  <span
                    className="block mb-1.5 uppercase"
                    style={{ color: palette.textFaint, letterSpacing: "0.07em", fontSize: "10px", fontWeight: 600 }}
                  >
                    Account
                  </span>
                  <div className="flex flex-col gap-1.5 items-start">
                    {pfFilterChip(pfFilterInstant === "all", "Any", () => setPfFilterInstant("all"))}
                    {pfFilterChip(pfFilterInstant === "instant", "Instant", () => setPfFilterInstant("instant"))}
                    {pfFilterChip(pfFilterInstant === "evaluation", "Evaluation", () => setPfFilterInstant("evaluation"))}
                  </div>
                </div>

                <div>
                  <span
                    className="block mb-1.5 uppercase"
                    style={{ color: palette.textFaint, letterSpacing: "0.07em", fontSize: "10px", fontWeight: 600 }}
                  >
                    Phases
                  </span>
                  <div className="flex flex-col gap-1.5 items-start">
                    {pfFilterChip(pfFilterPhases === "all", "Any", () => setPfFilterPhases("all"))}
                    {pfFilterChip(pfFilterPhases === "1", "1-Step", () => setPfFilterPhases("1"))}
                    {pfFilterChip(pfFilterPhases === "2", "2-Step", () => setPfFilterPhases("2"))}
                  </div>
                </div>
              </div>

              <p className="text-xs mt-3" style={{ color: palette.textFaint }}>
                Firms shown if any plan matches.
              </p>
            </div>
          )}

<span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
  {q || filtersActive ? `Matching Firms (${filteredFirms.length})` : "Choose a Firm"}
</span>

<div className="flex gap-2 mb-4">
  {[
    { id: "all", label: "All" },
    { id: "cfd", label: "CFD" },
    { id: "futures", label: "Futures" },
  ].map((market) => {
    const active = pfMarketType === market.id;

    return (
      <button
        key={market.id}
        type="button"
        onClick={() => {
          setPfMarketType(market.id);
          setPfFirmId(null);
          setPfPlanId(null);
          setPfSizeAmount(null);
          setPfPhaseIdx(0);
        }}
        className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
        style={{
          background: active ? palette.gold : palette.field,
          color: active ? palette.letterbox : palette.textMuted,
          border: `1px solid ${active ? palette.gold : palette.border}`,
          fontFamily: mono,
          fontSize: "12px",
          whiteSpace: "nowrap",
        }}
      >
        {market.label}
      </button>
    );
  })}
</div>
          {filteredFirms.length === 0 && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              No firm or plan matches "{pfSearch}".
            </p>
          )}
          {filteredFirms.map((f) => {
            const isApplied = linkedFirm?.firmName === f.name;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => { setPfFirmId(f.id); setPfSearch(""); }}
                className={`w-full flex items-center justify-between rounded-lg px-4 py-3.5 mb-2 ${TAP}`}
                style={{
                  background: palette.surface,
                  border: `1px solid ${isApplied ? palette.gold : palette.border}`,
                  boxShadow: palette.shadow,
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: palette.text, fontSize: "14px", fontWeight: 600 }}>{f.name}</span>
                    {isApplied && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontFamily: mono,
                          color: palette.gold,
                          border: `1px solid ${palette.gold}`,
                          borderRadius: "999px",
                          padding: "1px 6px",
                          textTransform: "uppercase",
                        }}
                      >
                        Applied
                      </span>
                    )}
                  </div>
<div
  style={{
    color: palette.textFaint,
    fontSize: "11px",
    marginTop: "2px",
    marginLeft: 0,
    paddingLeft: 0,
    textAlign: "left",
    display: "block",
    width: "100%",
  }}
>
  {f.plans.length} plan{f.plans.length === 1 ? "" : "s"} · verified {f.lastChecked}
</div>
                </div>
                <ChevronRight size={16} style={{ color: palette.textFaint }} />
              </button>
            );
          })}

          {!q && (
            <>
              <span className="block mt-4 mb-1.5 uppercase" style={{ color: palette.textFaint, letterSpacing: "0.08em", fontSize: "11px" }}>
                Not Mapped Yet
              </span>
              {COMING_SOON_FIRMS.map((name) => (
                <div
                  key={name}
                  className="w-full flex items-center justify-between rounded-lg px-4 py-3.5 mb-2"
                  style={{ background: "transparent", border: `1px dashed ${palette.border}`, opacity: 0.55 }}
                >
                  <div style={{ color: palette.textMuted, fontSize: "14px" }}>{name}</div>
                  <span style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono, textTransform: "uppercase" }}>
                    Coming soon
                  </span>
                </div>
              ))}
            </>
          )}
          <p className="text-xs mt-3" style={{ color: palette.textFaint }}>
            A firm shows up here only once every plan and account size has been checked against its current published
            rules — not just the flagship one.
          </p>
        </>
      );

    } else if (!plan) {
      const pfFundedMetric = (p) =>
        p.minTradingDays != null
          ? { value: p.minTradingDays, unit: "d" }
          : p.minTrades != null
          ? { value: p.minTrades, unit: "tr" }
          : { value: Infinity, unit: "" };
      const pfSorters = {
        split: (a, b) => num(b.profitSplitPct) - num(a.profitSplitPct),
        risk: (a, b) => num(a.maxRiskPct) - num(b.maxRiskPct),
        drawdown: (a, b) => num(b.phases[0].maxDrawdownPct) - num(a.phases[0].maxDrawdownPct),
        dailyLoss: (a, b) => num(b.phases[0].dailyLossPct) - num(a.phases[0].dailyLossPct),
        consistency: (a, b) => num(a.phases[0].consistencyPct) - num(b.phases[0].consistencyPct),
        target: (a, b) => {
          const ta = a.phases[0].targetPct === "instant" ? 0 : num(a.phases[0].targetPct);
          const tb = b.phases[0].targetPct === "instant" ? 0 : num(b.phases[0].targetPct);
          return ta - tb;
        },
        minDayGain: (a, b) => num(a.minDayGainPct) - num(b.minDayGainPct),
        size: (a, b) => Math.min(...a.sizes.map((s) => s.amount)) - Math.min(...b.sizes.map((s) => s.amount)),
        funded: (a, b) => pfFundedMetric(a).value - pfFundedMetric(b).value,
      };
      let visiblePlans = firm.plans.filter((p) => {
        if (pfFilterDdMode !== "all" && p.phases[0].ddMode !== pfFilterDdMode) return false;
        const isInstant = p.phases[0].targetPct === "instant";
        if (pfFilterInstant === "instant" && !isInstant) return false;
        if (pfFilterInstant === "evaluation" && isInstant) return false;
        if (pfFilterPhases !== "all" && String(p.phases.length) !== pfFilterPhases) return false;
        const q = pfSearch.trim().toLowerCase();
        if (q && !p.label.toLowerCase().includes(q)) return false;
        return true;
      });
      if (pfSortBy && pfSorters[pfSortBy]) {
        visiblePlans = [...visiblePlans].sort(pfSorters[pfSortBy]);
      }
      const pfFilterChip = (active, label, onClick) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
          style={{
            background: active ? palette.gold : palette.field,
            color: active ? palette.letterbox : palette.textMuted,
            border: `1px solid ${active ? palette.gold : palette.border}`,
            fontFamily: mono,
            fontSize: "12px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {label}
        </button>
      );

  body = (
    <>
      {crumbBack("Firms", resetPropFirmWizard)}
      <div className="flex items-center justify-between mb-4">
        <span className="uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
          {firm.name} — Choose a Plan
        </span>
        <button
          type="button"
          onClick={() => { setPfCompareMode((v) => !v); setPfCompareIds([]); }}
          className={TAP}
          style={{ color: pfCompareMode ? palette.gold : palette.textFaint, fontSize: "11px", fontFamily: mono }}
        >
          {pfCompareMode ? "Done comparing" : "Compare plans"}
        </button>
      </div>

      {visiblePlans.length === 0 && (
        <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
          No plans match these filters. Try loosening one above.
        </p>
      )}

      {pfCompareMode ? (
        <>
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            Tap up to 3 plans to compare side by side.
          </p>
          <div className="flex gap-2 flex-wrap mb-4">
            {visiblePlans.map((p) => {
              const selected = pfCompareIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setPfCompareIds((cur) =>
                      selected
                        ? cur.filter((id) => id !== p.id)
                        : cur.length >= 3
                        ? cur
                        : [...cur, p.id]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                  style={{
                    background: selected ? palette.gold : palette.field,
                    color: selected ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${selected ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "12.5px",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {pfCompareIds.length >= 2 && (
            <div
              className="rounded-2xl overflow-hidden mb-4"
              style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${pfCompareIds.length * 140 + 100}px` }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: `1px solid ${palette.gold}55`, background: palette.field }} />
                      {pfCompareIds.map((id) => {
                        const p = firm.plans.find((pp) => pp.id === id);
                        return (
                          <th
                            key={id}
                            style={{
                              textAlign: "left",
                              padding: "10px 12px",
                              borderBottom: `1px solid ${palette.gold}55`,
                              background: palette.field,
                              color: palette.text,
                              fontSize: "12px",
                              fontFamily: mono,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Target", get: (p) => p.phases.map((ph) => (ph.targetPct === "instant" ? "Instant" : `${ph.targetPct}%`)).join(" / ") },
                      { label: "Daily Loss", get: (p) => `${p.phases[0].dailyLossPct}%` },
                      { label: "Max Loss", get: (p) => `${p.phases[0].maxDrawdownPct}%` },
                      { label: "DD Type", get: (p) => (p.phases[0].ddMode === "static" ? "Static" : "Trailing") },
                      { label: "Consistency", get: (p) => (p.phases[0].consistencyPct === "0" ? "None" : `${p.phases[0].consistencyPct}%`) },
                      { label: "Min Days", get: (p) => (p.minTradingDays == null ? "None" : String(p.minTradingDays)) },
                      { label: "Profit Split", get: (p) => (p.profitSplitPct ? `${p.profitSplitPct}%` : "N/A") },
                    ].map((row, i) => (
                      <tr key={row.label} style={{ background: i % 2 === 1 ? `${palette.field}55` : "transparent" }}>
                        <td style={{ padding: "8px 12px", color: palette.textFaint, fontSize: "11px", whiteSpace: "nowrap" }}>{row.label}</td>
                        {pfCompareIds.map((id) => {
                          const p = firm.plans.find((pp) => pp.id === id);
                          return (
                            <td key={id} style={{ padding: "8px 12px", color: palette.text, fontSize: "12px", fontFamily: mono, whiteSpace: "nowrap" }}>
                              {row.get(p)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {visiblePlans.map((p) => {
        const isApplied = linkedFirm?.firmName === firm.name && linkedFirm?.planLabel === p.label;

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setPfPlanId(p.id)}
            className={`w-full text-left rounded-lg px-4 py-3.5 mb-2 ${TAP}`}
            style={{
              background: palette.surface,
              border: `1px solid ${isApplied ? palette.gold : palette.border}`,
              boxShadow: palette.shadow
            }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: "3px" }}>
              <span style={{ color: palette.text, fontSize: "14px", fontWeight: 600 }}>
                {p.label}
              </span>

              {isApplied && (
                <span
                  style={{
                    fontSize: "9px",
                    fontFamily: mono,
                    color: palette.gold,
                    border: `1px solid ${palette.gold}`,
                    borderRadius: "999px",
                    padding: "1px 6px",
                    textTransform: "uppercase"
                  }}
                >
                  Applied
                </span>
              )}
            </div>

            <div style={{ color: palette.textMuted, fontSize: "12px" }}>
              {p.blurb}
            </div>
          </button>
        );
      })}

      <p
        className="text-xs mt-4 mb-4"
        style={{
          color: palette.textFaint,
          textAlign: "center"
        }}
      >
        For more information visit their official website.
      </p>
    </>
  );
} else if (!size) {
      body = (
        <>
          {crumbBack(firm.name, () => setPfPlanId(null))}
          <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
            {plan.label} — Account Size
          </span>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {plan.sizes.map((s) => (
              <button
                key={s.amount}
                type="button"
                onClick={() => setPfSizeAmount(s.amount)}
                className={`flex flex-col items-center justify-center rounded-lg py-3 ${TAP}`}
                style={{
                  background: palette.surface,
                  border: `1px solid ${s.verified ? palette.border : `${palette.gold}55`}`,
                  opacity: s.verified ? 1 : 0.75,
                }}
              >
                <span style={{ fontFamily: mono, fontSize: "13px", color: palette.text }}>
                  ${(s.amount / 1000).toFixed(0)}K
                </span>
                {!s.verified && (
                  <span style={{ fontSize: "9px", fontFamily: mono, color: palette.gold, marginTop: "2px" }}>
                    unverified
                  </span>
                )}
                {s.payoutCap && (
                  <span style={{ fontSize: "9px", fontFamily: mono, color: palette.textFaint, marginTop: "2px" }}>
                    cap ${s.payoutCap}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: palette.textFaint }}>
            "Unverified" sizes assume the same percentages as the confirmed tier — double-check before relying on them.
          </p>
        </>
      );
    } else {
      body = (
        <>
          {crumbBack(`${plan.label} · ${firm.name}`, () => setPfSizeAmount(null))}
          {!size.verified && (
            <div className="rounded-lg p-3 mb-4" style={{ background: `${palette.gold}14`, border: `1px solid ${palette.gold}` }}>
              <p className="text-xs" style={{ color: palette.text }}>
                This account size hasn't been individually checked against {firm.name}'s current rules — the numbers
                below assume they match the confirmed tier.
              </p>
            </div>
          )}

          <Readout
            icon={Building2}
            eyebrow={`${firm.name} · ${plan.label} · $${(pfSizeAmount / 1000).toFixed(0)}K`}
            value={phase.targetPct === "instant" ? "Instant" : `${phase.targetPct}%`}
            unit={phase.targetPct === "instant" ? undefined : "target"}
            sub={phase.label}
          />

          {plan.phases.length > 1 && (
            <div className="flex gap-2 mb-4">
              {plan.phases.map((ph, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPfPhaseIdx(i)}
                  className={`flex-1 px-3 py-2 rounded-full ${TAP}`}
                  style={{
                    background: pfPhaseIdx === i ? palette.gold : palette.field,
                    color: pfPhaseIdx === i ? palette.letterbox : palette.textMuted,
                    border: `1px solid ${pfPhaseIdx === i ? palette.gold : palette.border}`,
                    fontFamily: mono,
                    fontSize: "13px",
                  }}
                >
                  {ph.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatChip label="Daily Loss" value={`${phase.dailyLossPct}%`} />
            <StatChip label="Max Drawdown" value={`${phase.maxDrawdownPct}%`} />
            <StatChip label="Drawdown Type" value={plan.ddMode === "static" ? "Static" : "Trailing"} />
            <StatChip label="Consistency Rule" value={phase.consistencyPct === "0" ? "None" : `${phase.consistencyPct}%`} />
            <StatChip label="Min Trading Days" value={plan.minTradingDays === null ? "None" : String(plan.minTradingDays)} />
            <StatChip label="Max Trading Days" value={plan.maxTradingDays} />
            <StatChip
              label="Min Day Gain %"
              value={plan.minDayGainPct && Number(plan.minDayGainPct) > 0 ? `${plan.minDayGainPct}%` : "None"}
            />
            <StatChip label="Profit Split" value={plan.profitSplitPct ? `${plan.profitSplitPct}%` : "N/A"} />
            {plan.minTrades != null && (
              <StatChip label="Min Trades" value={String(plan.minTrades)} />
            )}
            {size.payoutCap != null && (
              <StatChip label="Payout Cap" value={`$${size.payoutCap}/payout`} />
            )}
          </div>

          <button
            type="button"
            onClick={() => applyPropFirmToChallenge(firm, plan, phase)}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-2 ${TAP}`}
            style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "13px", fontWeight: 600 }}
          >
            <ArrowLeftRight size={16} />
            Apply to Challenge Calculator
          </button>
          <p className="text-xs mb-1" style={{ color: palette.textFaint }}>
            Sets your starting balance and every rule field on the Challenge tab to match this plan.      
         </p>
        </>
      );
    }
  
  return body;
}
