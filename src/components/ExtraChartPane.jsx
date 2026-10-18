import { useMemo } from "react";
import KLineBacktestChart from "./KLineBacktestChart.jsx";
import { aggregateCandles, bucketTime } from "../lib/mtf.js";

// One extra chart in the multi-chart layout: same symbol and replay position as the main chart,
// different timeframe. It has its own drawings (saved per symbol and timeframe).
export default function ExtraChartPane({ label, tf, tfOptions, onTfChange, visible, sessionKey, symbol, lines, markers, colors, precision, height, border, textColor, font }) {
  const data = useMemo(() => aggregateCandles(visible, tf.min), [visible, tf.min]);
  const mapped = useMemo(() => markers.map((m) => ({ ...m, time: bucketTime(m.time, tf.min) })), [markers, tf.min]);
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontFamily: font, fontSize: 12.5, color: textColor }}>
        <span style={{ opacity: 0.7 }}>{label}</span>
        <select
          value={tf.id}
          onChange={(e) => onTfChange(e.target.value)}
          aria-label={`${label} timeframe`}
          style={{ height: 28, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: textColor, fontFamily: font, fontSize: 12.5, padding: "0 8px" }}
        >
          {tfOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
      <KLineBacktestChart
        candles={data}
        sessionKey={`${sessionKey}-${tf.id}`}
        lines={lines}
        markers={mapped}
        colors={colors}
        precision={precision}
        compact
        hideTradeTools
        height={height}
        drawKey={`${symbol}@${tf.id}`}
      />
    </div>
  );
}
