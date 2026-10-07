import { BookOpen, Scale, Users } from "lucide-react";

export const ONBOARDING_SLIDES = [
  {
    icon: BookOpen,
    title: "Journal Every Trade",
    desc: "Log entries, exits, and lessons learned so you build a track record you can actually learn from.",
  },
  {
    icon: Scale,
    title: "Master Your Risk",
    desc: "Built-in risk-to-reward, consistency, and drawdown calculators keep every trade sized right.",
  },
  {
    icon: Users,
    title: "Trade Alongside Others",
    desc: "Join private groups, share signals, and chat with traders working the same setups as you.",
  },
];

// ---------- Onboarding ambient background ----------
// A live equity-curve motif: two soft traced lines, each with a small
// bright point of light continuously traveling along the path (the
// standard SVG stroke-dasharray/dashoffset "flowing line" technique used
// for live-data visualizations — GitHub's contribution graph, AWS
// architecture diagrams, Stripe's pipeline diagrams). That's the visible,
// obviously-animating signal; the lines themselves stay still so it never
// turns into a scrolling ticker.
export const ONBOARD_CURVE_BACK =
  "M0,420 C60,405 100,380 160,390 C220,400 260,460 320,450 C380,440 420,385 480,400 C540,415 580,425 640,420" +
  " C700,405 740,380 800,390 C860,400 900,460 960,450 C1020,440 1060,385 1120,400 C1180,415 1220,425 1280,420";

export const ONBOARD_CURVE_FRONT =
  "M0,560 C60,540 100,505 160,520 C220,535 260,615 320,600 C380,585 420,525 480,540 C540,555 580,575 640,560" +
  " C700,540 740,505 800,520 C860,535 900,615 960,600 C1020,585 1060,525 1120,540 C1180,555 1220,575 1280,560";

export const TOUR_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Tredzi",
    text: "Quick tour of the app \u2014 about 9 steps. Skip anytime with the button below.",
  },
  {
    id: "tab-risk",
    tabId: "risk",
    target: "tab-risk",
    title: "Challenge Calculator",
    text: "Track profit targets, daily/max drawdown, consistency rules, and position sizing for prop firm challenges.",
  },
  {
    id: "tab-propfirm",
    tabId: "propfirm",
    target: "tab-propfirm",
    title: "Prop Firm Rules",
    text: "Look up a firm's published rules and apply them straight into the Challenge calculator.",
  },
  {
    id: "tab-fx",
    tabId: "fx",
    target: "tab-fx",
    title: "Currency Convert",
    text: "Convert between currencies using live daily rates, or override with your broker's exact rate.",
  },
  {
    id: "tab-insights",
    tabId: "insights",
    target: "tab-insights",
    title: "Insights",
    text: "Deeper analytics \u2014 performance heatmap, discipline grade, setup and mood breakdowns.",
  },
  {
    id: "tab-journal",
    tabId: "journal",
    target: "tab-journal",
    title: "Trade Journal",
    text: "Log trades, watch your equity curve and calendar build, browse your history, keep quick notes, and follow your Trade plan.",
  },
  {
    id: "tab-broker",
    tabId: "broker",
    target: "tab-broker",
    title: "Broker",
    text: "Connect your trading account so your trades are logged to the journal automatically.",
  },
  {
    id: "tab-sessions",
    tabId: "sessions",
    target: "tab-sessions",
    title: "Sessions & News",
    text: "Track market session hours in your local time and set alarms for upcoming news events.",
  },
  {
    id: "settings-btn",
    target: "settings-btn",
    title: "Settings",
    text: "Customize theme, defaults, risk limits, tags, and more. You're all set \u2014 happy trading!",
  },
];
