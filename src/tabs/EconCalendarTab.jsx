import { useEffect, useMemo, useRef, useState } from "react";
import { palette, sans } from "../lib/theme.js";

// One-page markets view: economic calendar, news and stock movers (free embeddable widgets).
const SRC = "https://s3.tradingview.com/external-embedding/";

// The widget needs a real pixel height, so height is a number and is passed in both the
// container style and the widget config.
function Widget({ name, config, height }) {
  const hostRef = useRef(null);
  const configKey = JSON.stringify(config);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    host.innerHTML = "";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = `${height}px`;
    inner.style.width = "100%";
    host.appendChild(inner);
    const script = document.createElement("script");
    script.src = `${SRC}embed-widget-${name}.js`;
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({ ...JSON.parse(configKey), width: "100%", height });
    host.appendChild(script);
    return () => {
      host.innerHTML = "";
    };
  }, [name, configKey, height]);

  return (
    <div
      ref={hostRef}
      className="tradingview-widget-container"
      style={{ height, width: "100%" }}
    />
  );
}

function Panel({ title, right, children, style }) {
  return (
    <section
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: palette.shadow,
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          padding: "12px 14px 8px",
        }}
      >
        <div style={{ color: palette.text, fontSize: 14, fontWeight: 800, fontFamily: sans }}>{title}</div>
        {right}
      </div>
      <div style={{ padding: "0 6px 8px" }}>{children}</div>
    </section>
  );
}

function Chips({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              padding: "5px 11px",
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              border: `1px solid ${on ? palette.gold : palette.border}`,
              background: on ? palette.gold : "transparent",
              color: on ? "#111" : palette.textMuted,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const IMPACT = [
  { id: "high", label: "High", value: "1" },
  { id: "medium", label: "Medium + High", value: "0,1" },
  { id: "all", label: "All", value: "-1,0,1" },
];
const COUNTRIES = [
  { id: "us", label: "USD", value: "us" },
  { id: "major", label: "Major", value: "us,eu,gb,jp,ch,ca,au,nz,cn" },
  { id: "all", label: "All", value: "" },
];
const NEWS_FEEDS = [
  { id: "gold", label: "Gold", cfg: { feedMode: "symbol", symbol: "OANDA:XAUUSD" } },
  { id: "top", label: "Top", cfg: { feedMode: "all_symbols" } },
  { id: "forex", label: "Forex", cfg: { feedMode: "market", market: "forex" } },
  { id: "stock", label: "Stocks", cfg: { feedMode: "market", market: "stock" } },
  { id: "crypto", label: "Crypto", cfg: { feedMode: "market", market: "crypto" } },
];
const EXCHANGES = [
  { id: "US", label: "US" },
  { id: "NASDAQ", label: "NASDAQ" },
  { id: "NYSE", label: "NYSE" },
];

export default function EconCalendarTab({ theme = "dark", isDesktop }) {
  const [impact, setImpact] = useState("medium");
  const [country, setCountry] = useState("us");
  const [feed, setFeed] = useState("gold");
  const [exchange, setExchange] = useState("US");

  const colorTheme = theme === "light" ? "light" : "dark";
  const base = useMemo(() => ({ colorTheme, isTransparent: true, locale: "en" }), [colorTheme]);

  const calendarCfg = useMemo(() => {
    const cfg = { ...base, importanceFilter: IMPACT.find((i) => i.id === impact).value };
    const c = COUNTRIES.find((x) => x.id === country).value;
    if (c) cfg.countryFilter = c;
    return cfg;
  }, [base, impact, country]);

  const newsCfg = useMemo(
    () => ({ ...base, displayMode: "regular", ...NEWS_FEEDS.find((f) => f.id === feed).cfg }),
    [base, feed]
  );

  const moversCfg = useMemo(
    () => ({
      ...base,
      exchange,
      dateRange: "1D",
      showChart: true,
      showSymbolLogo: true,
      showFloatingTooltip: false,
    }),
    [base, exchange]
  );

  const sideH = isDesktop ? 460 : 520;
  const calH = isDesktop ? 460 * 2 + 112 : 640;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isDesktop ? "minmax(0, 1.25fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
        gap: 14,
        alignItems: "start",
        padding: isDesktop ? 0 : "0 12px",
      }}
    >
      <Panel
        title="Economic calendar"
        right={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Chips options={IMPACT} value={impact} onChange={setImpact} />
            <Chips options={COUNTRIES} value={country} onChange={setCountry} />
          </div>
        }
      >
        <Widget name="events" config={calendarCfg} height={calH} />
      </Panel>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <Panel title="News" right={<Chips options={NEWS_FEEDS} value={feed} onChange={setFeed} />}>
          <Widget name="timeline" config={newsCfg} height={sideH} />
        </Panel>
        <Panel title="Stocks up / down" right={<Chips options={EXCHANGES} value={exchange} onChange={setExchange} />}>
          <Widget name="hotlists" config={moversCfg} height={sideH} />
        </Panel>
      </div>
    </div>
  );
}
