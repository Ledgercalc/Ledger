import { useEffect, useMemo, useRef, useState } from "react";
import { palette, sans } from "../lib/theme.js";

// Economic calendar, news and stock movers using TradingView's free embeddable widgets.
// Each widget is a <script> that TradingView loads into the container. No backend needed.
const TV = "https://s3.tradingview.com/external-embedding/";

function TVWidget({ name, config, height }) {
  const hostRef = useRef(null);
  const configKey = JSON.stringify(config);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    host.innerHTML = "";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "100%";
    inner.style.width = "100%";
    host.appendChild(inner);
    const script = document.createElement("script");
    script.src = `${TV}embed-widget-${name}.js`;
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({ ...JSON.parse(configKey), width: "100%", height: "100%" });
    host.appendChild(script);
    return () => {
      host.innerHTML = "";
    };
  }, [name, configKey]);

  return (
    <div
      ref={hostRef}
      className="tradingview-widget-container"
      style={{ height, width: "100%", minHeight: 300 }}
    />
  );
}

function Panel({ title, right, children }) {
  return (
    <section
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: palette.shadow,
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
      <div style={{ padding: "0 6px 6px" }}>{children}</div>
      <div style={{ padding: "0 14px 10px", fontSize: 10, color: palette.textFaint }}>
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: palette.textFaint }}
        >
          Data by TradingView
        </a>
      </div>
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

const SUBTABS = [
  { id: "calendar", label: "Calendar" },
  { id: "news", label: "News" },
  { id: "movers", label: "Stocks up / down" },
  { id: "markets", label: "Markets" },
];

const IMPACT = [
  { id: "high", label: "High impact", value: "1" },
  { id: "medium", label: "Medium + High", value: "0,1" },
  { id: "all", label: "All", value: "-1,0,1" },
];
const COUNTRIES = [
  { id: "us", label: "USD only", value: "us" },
  { id: "major", label: "Major economies", value: "us,eu,gb,jp,ch,ca,au,nz,cn" },
  { id: "all", label: "All countries", value: "" },
];
const NEWS_FEEDS = [
  { id: "gold", label: "Gold", cfg: { feedMode: "symbol", symbol: "OANDA:XAUUSD" } },
  { id: "top", label: "Top stories", cfg: { feedMode: "all_symbols" } },
  { id: "forex", label: "Forex", cfg: { feedMode: "market", market: "forex" } },
  { id: "index", label: "Indices", cfg: { feedMode: "market", market: "index" } },
  { id: "stock", label: "Stocks", cfg: { feedMode: "market", market: "stock" } },
  { id: "crypto", label: "Crypto", cfg: { feedMode: "market", market: "crypto" } },
  { id: "economic", label: "Economy", cfg: { feedMode: "market", market: "economic" } },
];
const EXCHANGES = [
  { id: "US", label: "All US" },
  { id: "NASDAQ", label: "NASDAQ" },
  { id: "NYSE", label: "NYSE" },
];

export default function EconCalendarTab({ theme = "dark", isDesktop }) {
  const [sub, setSub] = useState("calendar");
  const [impact, setImpact] = useState("medium");
  const [country, setCountry] = useState("us");
  const [feed, setFeed] = useState("gold");
  const [exchange, setExchange] = useState("US");

  const colorTheme = theme === "light" ? "light" : "dark";
  const base = useMemo(() => ({ colorTheme, isTransparent: true, locale: "en" }), [colorTheme]);

  const calendarCfg = useMemo(() => {
    const cfg = {
      ...base,
      importanceFilter: IMPACT.find((i) => i.id === impact).value,
    };
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

  const overviewCfg = useMemo(
    () => ({
      ...base,
      dateRange: "1D",
      showChart: true,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      tabs: [
        {
          title: "Metals & oil",
          originalTitle: "Metals & oil",
          symbols: [
            { s: "OANDA:XAUUSD", d: "Gold" },
            { s: "OANDA:XAGUSD", d: "Silver" },
            { s: "TVC:USOIL", d: "WTI crude" },
            { s: "TVC:DXY", d: "US Dollar Index" },
            { s: "TVC:US10Y", d: "US 10Y yield" },
          ],
        },
        {
          title: "Indices",
          originalTitle: "Indices",
          symbols: [
            { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
            { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" },
            { s: "FOREXCOM:DJI", d: "Dow Jones" },
            { s: "INDEX:DEU40", d: "DAX" },
            { s: "INDEX:NKY", d: "Nikkei 225" },
          ],
        },
        {
          title: "Forex",
          originalTitle: "Forex",
          symbols: [
            { s: "FX:EURUSD", d: "EUR/USD" },
            { s: "FX:GBPUSD", d: "GBP/USD" },
            { s: "FX:USDJPY", d: "USD/JPY" },
            { s: "FX:AUDUSD", d: "AUD/USD" },
            { s: "FX:USDCAD", d: "USD/CAD" },
          ],
        },
      ],
    }),
    [base]
  );

  const heatmapCfg = useMemo(
    () => ({
      ...base,
      exchanges: [],
      dataSource: "SPX500",
      grouping: "sector",
      blockSize: "market_cap_basic",
      blockColor: "change",
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
    }),
    [base]
  );

  const tall = isDesktop ? 760 : 620;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: isDesktop ? 0 : "0 12px" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {SUBTABS.map((t) => {
          const on = sub === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSub(t.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                border: `1px solid ${on ? palette.gold : palette.border}`,
                background: on ? palette.gold : palette.surface,
                color: on ? "#111" : palette.textMuted,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {sub === "calendar" && (
        <Panel
          title="Economic calendar"
          right={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Chips options={IMPACT} value={impact} onChange={setImpact} />
              <Chips options={COUNTRIES} value={country} onChange={setCountry} />
            </div>
          }
        >
          <TVWidget name="events" config={calendarCfg} height={tall} />
        </Panel>
      )}

      {sub === "news" && (
        <Panel title="Market news" right={<Chips options={NEWS_FEEDS} value={feed} onChange={setFeed} />}>
          <TVWidget name="timeline" config={newsCfg} height={tall} />
        </Panel>
      )}

      {sub === "movers" && (
        <Panel
          title="Top gainers, losers and most active"
          right={<Chips options={EXCHANGES} value={exchange} onChange={setExchange} />}
        >
          <TVWidget name="hotlists" config={moversCfg} height={tall} />
        </Panel>
      )}

      {sub === "markets" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)",
            gap: 14,
          }}
        >
          <Panel title="Market overview">
            <TVWidget name="market-overview" config={overviewCfg} height={isDesktop ? 620 : 520} />
          </Panel>
          <Panel title="S&P 500 heatmap">
            <TVWidget name="stock-heatmap" config={heatmapCfg} height={isDesktop ? 620 : 480} />
          </Panel>
        </div>
      )}
    </div>
  );
}
