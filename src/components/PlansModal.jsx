import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { communityApi } from "../api/community.js";
import { PLAN_HIGHLIGHTS, PLAN_IDS, PLAN_NAMES, PLAN_PRICES, PLAN_TABLE, PLAN_TAGLINES } from "../data/plans.js";
import { closePlans, openPlans, setMyPlan, useMyPlan, usePlansModal } from "../lib/planStore.js";
import { display, mono, palette, sans } from "../lib/theme.js";
import { PlanBadge } from "./PlanBadge.jsx";

const money = (n) => (n === 0 ? "$0" : `$${Number.isInteger(n) ? n : n.toFixed(2)}`);
const yearlySaving = (p) => Math.round((1 - PLAN_PRICES[p].yearly / (PLAN_PRICES[p].monthly * 12)) * 100);
const bestSaving = Math.max(yearlySaving("pro"), yearlySaving("creator"));

// One plan card. Stacks full width on a phone and sits three across on a PC.
function PlanCard({ id, interval, current, busy, onChoose }) {
  const price = PLAN_PRICES[id];
  const free = id === "free";
  const perMonth = interval === "yearly" ? price.yearly / 12 : price.monthly;
  const popular = id === "pro";
  const highlighted = current || popular;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        padding: "20px 16px 16px",
        borderRadius: "18px",
        background: palette.surface,
        border: `${highlighted ? 2 : 1}px solid ${highlighted ? palette.gold : palette.border}`,
        minWidth: 0,
      }}
    >
      {popular && !current && (
        <span style={{ position: "absolute", top: "-11px", left: "16px", padding: "3px 10px", borderRadius: "999px", background: palette.gold, color: "#fff", fontSize: "10.5px", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", fontFamily: sans }}>
          Most popular
        </span>
      )}
      {current && (
        <span style={{ position: "absolute", top: "-11px", left: "16px", padding: "3px 10px", borderRadius: "999px", background: palette.field, border: `1px solid ${palette.gold}`, color: palette.text, fontSize: "10.5px", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", fontFamily: sans }}>
          Your plan
        </span>
      )}

      <div>
        <div style={{ minHeight: "24px", display: "flex", alignItems: "center" }}>
          {free ? <span style={{ fontFamily: display, fontWeight: 800, fontSize: "17px", color: palette.text }}>Free</span> : <PlanBadge plan={id} size="md" />}
        </div>
        <div style={{ marginTop: "4px", fontSize: "12.5px", color: palette.textMuted, fontFamily: sans }}>{PLAN_TAGLINES[id]}</div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
          <span style={{ fontFamily: mono, fontWeight: 800, fontSize: "30px", color: palette.text, lineHeight: 1 }}>{money(free ? 0 : perMonth)}</span>
          <span style={{ fontSize: "12.5px", color: palette.textMuted, fontFamily: sans }}>{free ? "forever" : "/ month"}</span>
        </div>
        <div style={{ marginTop: "6px", minHeight: "16px", fontSize: "11.5px", color: palette.textFaint, fontFamily: sans }}>
          {free ? "No card needed" : interval === "yearly" ? `Billed ${money(price.yearly)} a year · save ${yearlySaving(id)}%` : "Billed monthly"}
        </div>
      </div>

      <button
        type="button"
        disabled={current || !!busy}
        onClick={() => onChoose(id)}
        style={{
          width: "100%",
          padding: "11px 8px",
          borderRadius: "12px",
          border: `1px solid ${current ? palette.border : palette.gold}`,
          fontSize: "13.5px",
          fontWeight: 800,
          fontFamily: sans,
          cursor: current || busy ? "default" : "pointer",
          background: current ? palette.field : free ? "transparent" : palette.gold,
          color: current ? palette.textMuted : free ? palette.text : "#fff",
          opacity: busy && busy !== id ? 0.6 : 1,
        }}
      >
        {current ? "Current plan" : busy === id ? "Working..." : free ? "Switch to Free" : `Get ${PLAN_NAMES[id]}`}
      </button>

      <ul style={{ listStyle: "none", margin: 0, padding: "14px 0 0", borderTop: `1px solid ${palette.border}`, display: "flex", flexDirection: "column", gap: "9px" }}>
        {PLAN_HIGHLIGHTS[id].map((line) => (
          <li key={line} style={{ display: "flex", gap: "9px", alignItems: "flex-start", fontSize: "13px", lineHeight: 1.35, color: palette.text, fontFamily: sans }}>
            <Check size={15} strokeWidth={3} style={{ color: palette.green, flexShrink: 0, marginTop: "2px" }} />
            <span style={{ minWidth: 0 }}>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// One shared upgrade screen. Mount <PlansHost session={session} /> once in App; open it from anywhere
// with openPlans("reason") from lib/planStore.js.
export function PlansHost({ session }) {
  const { open, reason } = usePlansModal();
  const me = useMyPlan();
  const [interval, setInterval_] = useState("yearly");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [showTable, setShowTable] = useState(false);
  if (!open) return null;

  const choose = async (plan) => {
    setError("");
    if (!session?.token) { setError("Sign in to your account first (Settings > Community)."); return; }
    setBusy(plan);
    try {
      // TEST MODE: the Worker only allows this while PLAN_TEST_MODE = "1". Swap this call for your
      // payment checkout (Stripe etc.) when you go live; the webhook then sets the plan server-side.
      const data = await communityApi("/billing/test-set-plan", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ plan, interval }),
      });
      setMyPlan({ ...me, plan: data.plan, planInterval: data.planInterval, planExpiresAt: data.planExpiresAt });
      closePlans();
    } catch (err) {
      setError(err.message || "Couldn't change your plan.");
    } finally {
      setBusy("");
    }
  };

  const cell = { padding: "10px 6px", fontSize: "12.5px", textAlign: "center", fontFamily: sans, color: palette.text };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plans"
      onClick={closePlans}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "calc(env(safe-area-inset-top, 0px) + 16px) 12px calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "880px", margin: "auto 0", background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: "22px", padding: "22px 16px", boxShadow: palette.shadow }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: display, fontSize: "24px", fontWeight: 800, color: palette.text, lineHeight: 1.15 }}>Choose your plan</div>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: reason ? palette.text : palette.textMuted, fontFamily: sans, lineHeight: 1.4 }}>
              {reason || "Start free. Upgrade when you want sync, auto-logging and deeper Insights."}
            </p>
          </div>
          <button type="button" onClick={closePlans} aria-label="Close" style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted, width: "34px", height: "34px", borderRadius: "999px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: "18px 0 22px", flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", padding: "3px", borderRadius: "999px", border: `1px solid ${palette.border}`, background: palette.field }}>
            {["monthly", "yearly"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setInterval_(k)}
                style={{ padding: "8px 18px", borderRadius: "999px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 800, fontFamily: sans, background: interval === k ? palette.gold : "transparent", color: interval === k ? "#fff" : palette.textMuted }}
              >
                {k === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: palette.green, fontFamily: sans }}>Save up to {bestSaving}% yearly</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "18px 12px", alignItems: "stretch" }}>
          {PLAN_IDS.map((p) => (
            <PlanCard key={p} id={p} interval={interval} current={me.plan === p} busy={busy} onChoose={choose} />
          ))}
        </div>
        {error && <p role="alert" style={{ margin: "12px 0 0", color: palette.red, fontSize: "12.5px", fontFamily: sans }}>{error}</p>}

        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          style={{ marginTop: "20px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "11px", borderRadius: "12px", border: `1px solid ${palette.border}`, background: palette.surface, color: palette.text, fontSize: "13px", fontWeight: 700, fontFamily: sans, cursor: "pointer" }}
        >
          {showTable ? "Hide full comparison" : "Compare all features"}
          <ChevronDown size={16} style={{ transform: showTable ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </button>

        {showTable && (
          <div style={{ marginTop: "12px", border: `1px solid ${palette.border}`, borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) repeat(3, minmax(0, 1fr))", alignItems: "center", background: palette.field, padding: "0 6px" }}>
              <div style={{ ...cell, textAlign: "left", paddingLeft: "4px" }} />
              {PLAN_IDS.map((p) => (
                <div key={p} style={{ ...cell, fontWeight: 800, color: me.plan === p ? palette.gold : palette.text }}>{PLAN_NAMES[p]}</div>
              ))}
            </div>
            {PLAN_TABLE.map((row, i) =>
              row.section ? (
                <div key={i} style={{ padding: "8px 10px", background: palette.field, borderTop: `1px solid ${palette.border}`, fontWeight: 800, fontSize: "10.5px", letterSpacing: ".09em", textTransform: "uppercase", color: palette.textMuted, fontFamily: sans }}>{row.section}</div>
              ) : (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) repeat(3, minmax(0, 1fr))", alignItems: "center", borderTop: `1px solid ${palette.border}`, padding: "0 6px" }}>
                  <div style={{ ...cell, textAlign: "left", paddingLeft: "4px", lineHeight: 1.3 }}>{row.label}</div>
                  {row.values.map((v, j) => (
                    <div key={j} style={{ ...cell, fontWeight: 700, color: v === "No" || v === "-" ? palette.textFaint : v === "Yes" ? palette.green : palette.text }}>
                      {v === "Yes" ? <Check size={15} strokeWidth={3} style={{ verticalAlign: "middle" }} /> : v}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
        <p style={{ margin: "14px 0 0", fontSize: "11px", color: palette.textFaint, fontFamily: sans, textAlign: "center" }}>Prices shown are test values until payments are connected.</p>
      </div>
    </div>
  );
}

// Settings > Plan section body.
const PLAN_TINT = {
  free: { bg: "transparent", border: null },
  pro: { bg: "linear-gradient(135deg, rgba(14,165,233,.16), rgba(99,102,241,.12))", border: "rgba(56,189,248,.45)" },
  creator: { bg: "linear-gradient(135deg, rgba(139,92,246,.18), rgba(244,63,126,.12))", border: "rgba(192,38,211,.45)" },
};

export function PlanSettingsCard() {
  const me = useMyPlan();
  const free = me.plan === "free";
  const tint = PLAN_TINT[me.plan] || PLAN_TINT.free;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ padding: "18px 16px", borderRadius: "18px", background: tint.bg === "transparent" ? palette.surface : tint.bg, border: `1px solid ${tint.border || palette.border}`, display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase", color: palette.textFaint, fontFamily: sans }}>Your plan</div>
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
              {free ? <span style={{ fontFamily: display, fontWeight: 800, fontSize: "24px", color: palette.text, lineHeight: 1 }}>Free</span> : <PlanBadge plan={me.plan} size="lg" />}
            </div>
            <div style={{ marginTop: "8px", fontSize: "12.5px", color: palette.textMuted, fontFamily: sans }}>
              {free ? "Upgrade any time. Your data stays." : me.expiresAt ? `${me.interval === "yearly" ? "Yearly" : "Monthly"} plan · active until ${new Date(me.expiresAt).toLocaleDateString()}` : PLAN_TAGLINES[me.plan]}
            </div>
          </div>
          <button
            type="button"
            onClick={() => openPlans()}
            style={{ padding: "11px 20px", borderRadius: "12px", border: free ? "none" : `1px solid ${tint.border}`, background: free ? palette.gold : "transparent", color: free ? "#fff" : palette.text, fontWeight: 800, fontSize: "13px", fontFamily: sans, cursor: "pointer" }}
          >
            {free ? "See plans" : "Manage plan"}
          </button>
        </div>

        <div style={{ borderTop: `1px solid ${tint.border || palette.border}`, paddingTop: "14px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase", color: palette.textFaint, fontFamily: sans, marginBottom: "10px" }}>Included</div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "9px 14px" }}>
            {PLAN_HIGHLIGHTS[me.plan].slice(0, 6).map((line) => (
              <li key={line} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "13px", lineHeight: 1.35, color: palette.text, fontFamily: sans }}>
                <Check size={15} strokeWidth={3} style={{ color: palette.green, flexShrink: 0, marginTop: "2px" }} />
                <span style={{ minWidth: 0 }}>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {free && (
        <p style={{ margin: 0, fontSize: "12.5px", color: palette.textMuted, fontFamily: sans, lineHeight: 1.5 }}>
          Upgrade to Pro for cloud sync across your devices, MT5 auto-sync, and the full Insights.
        </p>
      )}
    </div>
  );
}

// Drop-in "locked" panel for a feature the current plan doesn't include.
export function PlanLockCard({ title, plan = "pro", blurb }) {
  return (
    <div style={{ border: `1px solid ${palette.border}`, borderRadius: "14px", padding: "22px 16px", background: palette.surface, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <PlanBadge plan={plan} size="md" />
      <div style={{ fontFamily: display, fontWeight: 800, fontSize: "16px", color: palette.text }}>{title}</div>
      <div style={{ fontSize: "12.5px", color: palette.textMuted, fontFamily: sans, maxWidth: "320px" }}>{blurb || `Available on the ${PLAN_NAMES[plan]} plan and above.`}</div>
      <button type="button" onClick={() => openPlans(`${title} is part of ${PLAN_NAMES[plan]}.`)}
        style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: palette.gold, color: "#fff", fontWeight: 700, fontSize: "12.5px", fontFamily: sans, cursor: "pointer" }}>
        See plans
      </button>
    </div>
  );
}
