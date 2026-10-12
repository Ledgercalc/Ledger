import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Newspaper, TrendingUp } from "lucide-react";
import { palette, sans } from "../lib/theme.js";

const SRC = "https://s3.tradingview.com/external-embedding/";
const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// Widgets need a real pixel height, so it is passed both to the container and to the widget config.
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

  return <div ref={hostRef} className="tradingview-widget-container" style={{ height, width: "100%" }} />;
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div
      className="ec-seg"
      role="radiogroup"
      aria-label={label}
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        borderRadius: 11,
        background: tint(palette.text, 5),
        border: `1px solid ${palette.border}`,
        flexShrink: 0,
      }}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 8,
              border: 0,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: sans,
              background: on ? tint(palette.gold, 18) : "transparent",
              color: on ? palette.gold : palette.textMuted,
              transition: "background .15s ease, color .15s ease",
            }}
          >
            {o.dot && (
              <span
                aria-hidden="true"
                style={{ width: 7, height: 7, borderRadius: 99, background: o.dot, opacity: on ? 1 : 0.7 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, hint, controls }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        minHeight: 52,
        padding: "8px 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            display: "grid",
            placeItems: "center",
            width: 28,
            height: 28,
            borderRadius: 9,
            background: tint(palette.gold, 14),
            color: palette.gold,
            flexShrink: 0,
          }}
        >
          <Icon size={15} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: palette.text, fontSize: 14.5, fontWeight: 800, fontFamily: sans, lineHeight: 1.2 }}>
            {title}
          </div>
          {hint && <div style={{ color: palette.textFaint, fontSize: 11, marginTop: 2 }}>{hint}</div>}
        </div>
      </div>
      {controls}
    </div>
  );
}

const hairline = { borderTop: `1px solid ${palette.border}` };

const IMPACT = [
  { id: "high", label: "High", value: "1", dot: palette.red },
  { id: "medium", label: "Medium+", value: "0,1", dot: "#f5a524" },
  { id: "all", label: "All", value: "-1,0,1", dot: palette.textFaint },
];
const REGION = [
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
const TICKER = [
  { proName: "OANDA:XAUUSD", title: "Gold" },
  { proName: "TVC:DXY", title: "Dollar index" },
  { proName: "TVC:US10Y", title: "US 10Y" },
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
  { proName: "TVC:USOIL", title: "WTI crude" },
  { proName: "FX:EURUSD", title: "EUR/USD" },
  { proName: "FX:USDJPY", title: "USD/JPY" },
  { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
];

export default function EconCalendarTab({ theme = "dark", isDesktop }) {
  const [impact, setImpact] = useState("medium");
  const [region, setRegion] = useState("us");
  const [feed, setFeed] = useState("gold");
  const [exchange, setExchange] = useState("US");

  const colorTheme = theme === "light" ? "light" : "dark";
  const base = useMemo(() => ({ colorTheme, isTransparent: true, locale: "en" }), [colorTheme]);
  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ");
    } catch (e) {
      return "your local time";
    }
  }, []);

  const tickerCfg = useMemo(
    () => ({ ...base, symbols: TICKER, showSymbolLogo: true, displayMode: "regular" }),
    [base]
  );
  const calendarCfg = useMemo(() => {
    const cfg = { ...base, importanceFilter: IMPACT.find((i) => i.id === impact).value };
    const c = REGION.find((r) => r.id === region).value;
    if (c) cfg.countryFilter = c;
    return cfg;
  }, [base, impact, region]);
  const newsCfg = useMemo(
    () => ({ ...base, displayMode: "regular", ...NEWS_FEEDS.find((f) => f.id === feed).cfg }),
    [base, feed]
  );
  const moversCfg = useMemo(
    () => ({ ...base, exchange, dateRange: "1D", showChart: true, showSymbolLogo: true, showFloatingTooltip: false }),
    [base, exchange]
  );

  const sideH = isDesktop ? 420 : 480;
  // Left column height = right column (two widgets + the second header + hairline), so both end together.
  const calH = isDesktop ? sideH * 2 + 53 : 620;

  const calendar = (
    <div style={{ minWidth: 0 }}>
      <SectionHeader
        icon={CalendarDays}
        title="Economic calendar"
        hint={`Times in ${tz}`}
        controls={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Segmented label="Impact" options={IMPACT} value={impact} onChange={setImpact} />
            <Segmented label="Region" options={REGION} value={region} onChange={setRegion} />
          </div>
        }
      />
      <div style={{ padding: "0 8px 8px" }}>
        <Widget name="events" config={calendarCfg} height={calH} />
      </div>
    </div>
  );

  const news = (
    <div style={{ minWidth: 0 }}>
      <SectionHeader
        icon={Newspaper}
        title="News"
        controls={<Segmented label="News feed" options={NEWS_FEEDS} value={feed} onChange={setFeed} />}
      />
      <div style={{ padding: "0 8px 8px" }}>
        <Widget name="timeline" config={newsCfg} height={sideH} />
      </div>
    </div>
  );

  const movers = (
    <div style={{ minWidth: 0 }}>
      <SectionHeader
        icon={TrendingUp}
        title="Stocks up and down"
        controls={<Segmented label="Exchange" options={EXCHANGES} value={exchange} onChange={setExchange} />}
      />
      <div style={{ padding: "0 8px 8px" }}>
        <Widget name="hotlists" config={moversCfg} height={sideH} />
      </div>
    </div>
  );

  return (
    <div style={{ padding: isDesktop ? 0 : "0 12px" }}>
      <style>{`.ec-seg button:focus-visible{outline:2px solid ${palette.gold};outline-offset:1px}
@media (prefers-reduced-motion: reduce){.ec-seg button{transition:none!important}}`}</style>
      <div
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: palette.shadow,
        }}
      >
        <div style={{ padding: "2px 8px" }}>
          <Widget name="ticker-tape" config={tickerCfg} height={76} />
        </div>

        {isDesktop ? (
          <div style={{ ...hairline, display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)" }}>
            <div style={{ borderRight: `1px solid ${palette.border}` }}>{calendar}</div>
            <div>
              {news}
              <div style={hairline}>{movers}</div>
            </div>
          </div>
        ) : (
          <>
            <div style={hairline}>{calendar}</div>
            <div style={hairline}>{news}</div>
            <div style={hairline}>{movers}</div>
          </>
        )}
      </div>
    </div>
  );
}
