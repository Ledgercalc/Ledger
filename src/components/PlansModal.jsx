import { useState } from "react";
import { communityApi } from "../api/community.js";
import { PLAN_IDS, PLAN_NAMES, PLAN_PRICES, PLAN_TABLE } from "../data/plans.js";
import { closePlans, openPlans, setMyPlan, useMyPlan, usePlansModal } from "../lib/planStore.js";
import { display, mono, palette, sans } from "../lib/theme.js";
import { PlanBadge } from "./PlanBadge.jsx";

const money = (n) => (n === 0 ? "$0" : `$${Number.isInteger(n) ? n : n.toFixed(2)}`);
const yearlySaving = (p) => Math.round((1 - PLAN_PRICES[p].yearly / (PLAN_PRICES[p].monthly * 12)) * 100);

// One shared upgrade screen. Mount <PlansHost session={session} /> once in App; open it from anywhere
// with openPlans("reason") from lib/planStore.js.
export function PlansHost({ session }) {
  const { open, reason } = usePlansModal();
  const me = useMyPlan();
  const [interval, setInterval_] = useState("yearly");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
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

  const cell = { padding: "9px 6px", fontSize: "12px", textAlign: "center", fontFamily: sans, color: palette.text };
  return (
    <div role="dialog" aria-modal="true" aria-label="Plans" onClick={closePlans}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "calc(env(safe-area-inset-top, 0px) + 16px) 12px 24px" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "720px", background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: "18px", padding: "18px 14px", boxShadow: palette.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
          <div style={{ fontFamily: display, fontSize: "20px", fontWeight: 800, color: palette.text }}>Choose your plan</div>
          <button type="button" onClick={closePlans} aria-label="Close" style={{ background: "none", border: "none", color: palette.textMuted, fontSize: "22px", lineHeight: 1, cursor: "pointer" }}>×</button>
        </div>
        {reason && <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: palette.textMuted, fontFamily: sans }}>{reason}</p>}

        <div style={{ display: "inline-flex", margin: "14px 0", padding: "3px", borderRadius: "999px", border: `1px solid ${palette.border}`, background: palette.field }}>
          {["monthly", "yearly"].map((k) => (
            <button key={k} type="button" onClick={() => setInterval_(k)}
              style={{ padding: "6px 14px", borderRadius: "999px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, fontFamily: sans, background: interval === k ? palette.gold : "transparent", color: interval === k ? "#fff" : palette.textMuted }}>
              {k === "monthly" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
          {PLAN_IDS.map((p) => {
            const current = me.plan === p;
            const price = PLAN_PRICES[p][interval];
            return (
              <div key={p} style={{ border: `1px solid ${current ? palette.gold : palette.border}`, borderRadius: "14px", padding: "12px 8px", background: palette.surface, textAlign: "center", display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                <div style={{ minHeight: "22px", display: "flex", alignItems: "center" }}>
                  {p === "free" ? <span style={{ fontWeight: 800, color: palette.text, fontSize: "13px" }}>Free</span> : <PlanBadge plan={p} size="md" />}
                </div>
                <div style={{ fontFamily: mono, fontWeight: 800, fontSize: "18px", color: palette.text }}>{money(price)}</div>
                <div style={{ fontSize: "10.5px", color: palette.textFaint, fontFamily: sans, minHeight: "26px" }}>
                  {p === "free" ? "forever" : interval === "monthly" ? "per month" : `per year · save ${yearlySaving(p)}%`}
                </div>
                <button type="button" disabled={current || !!busy} onClick={() => choose(p)}
                  style={{ width: "100%", padding: "8px 4px", borderRadius: "10px", border: `1px solid ${palette.border}`, fontSize: "12px", fontWeight: 700, fontFamily: sans, cursor: current || busy ? "default" : "pointer", background: current ? palette.field : palette.gold, color: current ? palette.textMuted : "#fff", opacity: busy && busy !== p ? 0.6 : 1 }}>
                  {current ? "Current plan" : busy === p ? "Working…" : p === "free" ? "Switch to Free" : `Get ${PLAN_NAMES[p]}`}
                </button>
              </div>
            );
          })}
        </div>
        {error && <p role="alert" style={{ margin: "10px 0 0", color: palette.red, fontSize: "12.5px", fontFamily: sans }}>{error}</p>}

        <div style={{ marginTop: "14px", border: `1px solid ${palette.border}`, borderRadius: "12px", overflow: "hidden" }}>
          {PLAN_TABLE.map((row, i) =>
            row.section ? (
              <div key={i} style={{ padding: "8px 10px", background: palette.field, fontWeight: 800, fontSize: "11px", letterSpacing: ".08em", textTransform: "uppercase", color: palette.textMuted, fontFamily: sans }}>{row.section}</div>
            ) : (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) repeat(3, minmax(0, 1fr))", alignItems: "center", borderTop: `1px solid ${palette.border}`, padding: "0 6px" }}>
                <div style={{ ...cell, textAlign: "left", paddingLeft: "4px" }}>{row.star ? "★ " : ""}{row.label}</div>
                {row.values.map((v, j) => (
                  <div key={j} style={{ ...cell, fontWeight: 700, color: v === "No" ? palette.textFaint : v === "Yes" ? palette.green : palette.text }}>{v}</div>
                ))}
              </div>
            )
          )}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: "11px", color: palette.textFaint, fontFamily: sans }}>Prices shown are test values until payments are connected.</p>
      </div>
    </div>
  );
}

// Settings > Plan section body.
export function PlanSettingsCard() {
  const me = useMyPlan();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: sans, color: palette.text, fontSize: "13px" }}>
        <span>Your plan:</span>
        {me.plan === "free" ? <b>Free</b> : <PlanBadge plan={me.plan} size="md" />}
      </div>
      {me.plan !== "free" && me.expiresAt && (
        <div style={{ fontSize: "12px", color: palette.textMuted, fontFamily: sans }}>
          {me.interval === "yearly" ? "Yearly" : "Monthly"} · active until {new Date(me.expiresAt).toLocaleDateString()}
        </div>
      )}
      <button type="button" onClick={() => openPlans()}
        style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: "10px", border: `1px solid ${palette.border}`, background: palette.gold, color: "#fff", fontWeight: 700, fontSize: "12.5px", fontFamily: sans, cursor: "pointer" }}>
        {me.plan === "free" ? "See plans" : "Manage plan"}
      </button>
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
