import { useEffect, useRef } from "react";
import { CrosshairMode, LineStyle, createChart } from "lightweight-charts";

// Thin wrapper around TradingView's open-source Lightweight Charts (free, Apache 2.0).
// Props:
//   candles     visible candles only (the tab slices to the replay position)
//   sessionKey  changes whenever a new dataset / start point is loaded (resets the zoom)
//   lines       { entry, sl, tp } prices to draw as horizontal lines (NaN/undefined = hidden)
//   markers     [{ time, position, color, shape, text }] sorted by time
//   colors      { text, grid, border, up, down, entry, font }
//   pickMode    "sl" | "tp" | null - when set, the next chart click reports a price
export default function BacktestChart({ candles, sessionKey, lines, markers, colors, precision, height, pickMode, onPickPrice }) {
  const hostRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const prevRef = useRef({ len: 0, first: null, key: null });
  const priceLinesRef = useRef([]);
  const pickRef = useRef({ pickMode, onPickPrice });
  pickRef.current = { pickMode, onPickPrice };

  // Create once.
  useEffect(() => {
    const chart = createChart(hostRef.current, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: colors.text, fontFamily: colors.font },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border, timeVisible: true, secondsVisible: false, rightOffset: 8 },
    });
    const series = chart.addCandlestickSeries({
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      borderVisible: false,
      priceFormat: { type: "price", precision, minMove: 1 / Math.pow(10, precision) },
    });
    chart.subscribeClick((param) => {
      const { pickMode: mode, onPickPrice: cb } = pickRef.current;
      if (!mode || !param.point || !cb) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price != null) cb(price);
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
      prevRef.current = { len: 0, first: null, key: null };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme / precision changes.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    chart.applyOptions({
      layout: { textColor: colors.text, fontFamily: colors.font },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border },
    });
    series.applyOptions({
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      priceFormat: { type: "price", precision, minMove: 1 / Math.pow(10, precision) },
    });
  }, [colors.text, colors.grid, colors.border, colors.up, colors.down, colors.font, precision]);

  // Data: append one candle cheaply while stepping, otherwise reload.
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    const prev = prevRef.current;
    const n = candles.length;
    const first = n ? candles[0].time : null;
    const appended = prev.key === sessionKey && prev.first === first && n === prev.len + 1;
    if (appended) {
      series.update(candles[n - 1]);
    } else {
      series.setData(candles);
      if (prev.key !== sessionKey && n) {
        chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 140), to: n + 8 });
      }
    }
    prevRef.current = { len: n, first, key: sessionKey };
  }, [candles, sessionKey]);

  // Entry / SL / TP lines.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    priceLinesRef.current.forEach((l) => series.removePriceLine(l));
    priceLinesRef.current = [];
    const add = (price, color, title, lineStyle) => {
      if (!Number.isFinite(price)) return;
      priceLinesRef.current.push(
        series.createPriceLine({ price, color, lineWidth: 1, lineStyle, axisLabelVisible: true, title })
      );
    };
    add(lines.entry, colors.entry, "Entry", LineStyle.Solid);
    add(lines.sl, colors.down, "SL", LineStyle.Dashed);
    add(lines.tp, colors.up, "TP", LineStyle.Dashed);
  }, [lines.entry, lines.sl, lines.tp, colors.entry, colors.up, colors.down]);

  // Trade markers.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    series.setMarkers(markers);
  }, [markers]);

  return (
    <div
      ref={hostRef}
      style={{ width: "100%", height, cursor: pickMode ? "crosshair" : "default" }}
      aria-label="Price chart"
    />
  );
}
