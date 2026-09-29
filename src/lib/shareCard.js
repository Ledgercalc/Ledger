import { fmt, fmtMoney, fmtPct } from "./format.js";

export const SHARE_COLORS = {
  dark: {
    green: "#4FB286",
    red: "#DB6B63",
    gold: "#2E5C9A",
    goldBright: "#5B8AC4",
    text: "#F3F5F9",
    textMuted: "#A8B4CC",
    textFaint: "#7C89A6",
    border: "#3A4A6B",
    surface: "#1B2434",
    bgFrom: "#0E1420",
    bgTo: "#070A11",
    dotRing: "#070A11",
  },

  light: {
    green: "#0D9463",
    red: "#C43B2E",
    gold: "#2E5C9A",
    goldBright: "#1E4A7A",
    text: "#19170F",
    textMuted: "#68624F",
    textFaint: "#9D9782",
    border: "#E6E1D4",
    surface: "#FFFFFF",
    bgFrom: "#FFFFFF",
    bgTo: "#EDEBE3",
    dotRing: "#FFFFFF",
  },
};

export function drawShareCard(canvas, {
  rangeLabel,
  tradeCount,
  winRate,
  netPct,
  curve,
  bestStreak,
  worstStreak,
  topSetup,
  revengeCount,
  disciplineStreak,
  profitFactor,
  grade,
  topPair,
  paceTrend,
  recoveryFactor,
  consistencyLabel,
  activeDays,
  tone,
  theme,
  showDollarAmount,
  netDollar,
  traderAlias,
}) {

  const W = 1080;
  const H = 1600;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const c = theme === "light" ? SHARE_COLORS.light : SHARE_COLORS.dark;
  const isDark = theme !== "light";
  const lineColor = tone === "bad" ? c.red : c.green;
  const gradeColor = grade === "A" || grade === "B" ? c.green : grade === "D" || grade === "F" ? c.red : c.gold;
  const tint = isDark
    ? (tone === "bad" ? "#FF9B93" : "#7EE8C4")
    : (tone === "bad" ? "#8C2318" : "#0A6B49");

  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const drawLogoMark = (x, y, s, color) => {
    ctx.save();
    ctx.fillStyle = color;
    const barW = s * 0.26;
    const gap = s * 0.16;
    const heights = [s * 0.5, s * 0.95, s * 0.68];
    heights.forEach((h, i) => {
      const bx = x + i * (barW + gap);
      const by = y + (s - h);
      ctx.fillRect(bx + barW / 2 - 1.5, y - s * 0.15, 3, s * 1.15);
      ctx.fillRect(bx, by, barW, h);
    });
    ctx.restore();
  };

  // ---- outer letterbox ----
  ctx.fillStyle = c.bgTo;
  ctx.fillRect(0, 0, W, H);

  // ---- clipped inner card: gradient + aurora + grid (no watermark) ----
  ctx.save();
  roundRect(36, 36, W - 72, H - 72, 28);
  ctx.clip();

  ctx.fillStyle = c.bgFrom;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = isDark ? 0.3 : 0.16;
  ctx.fillStyle = c.textFaint;
  for (let yy = 60; yy < H - 40; yy += 34) {
    for (let xx = 60; xx < W - 40; xx += 34) {
      ctx.beginPath();
      ctx.arc(xx, yy, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.restore(); // end clip

  // ---- outer border with glow ----
  ctx.save();
  ctx.shadowColor = `${c.gold}55`;
  ctx.shadowBlur = 20;
  roundRect(36, 36, W - 72, H - 72, 28);
  ctx.strokeStyle = `${c.gold}77`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const drawCorner = (x, y, dx, dy) => {
    const len = 34;
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + dy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * len, y);
    ctx.stroke();
  };
  drawCorner(36, 36, 1, 1);
  drawCorner(W - 36, 36, -1, 1);
  drawCorner(36, H - 36, 1, -1);
  drawCorner(W - 36, H - 36, -1, -1);

  // ---- header ----
  drawLogoMark(80, 96, 26, c.gold);
  ctx.fillStyle = c.gold;
  ctx.font = "600 26px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("TREDZI · WEEKLY RECAP", 130, 118);

  if (grade && grade !== "N/A") {
    const badgeCx = W - 140;
    const badgeCy = 108;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r1 = 58;
      const r2 = 66;
      ctx.strokeStyle = `${gradeColor}${i % 2 === 0 ? "77" : "33"}`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(badgeCx + Math.cos(a) * r1, badgeCy + Math.sin(a) * r1);
      ctx.lineTo(badgeCx + Math.cos(a) * r2, badgeCy + Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.save();
    ctx.shadowColor = `${gradeColor}99`;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(badgeCx, badgeCy, 46, 0, Math.PI * 2);
    ctx.fillStyle = `${gradeColor}22`;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = gradeColor;
    ctx.stroke();
    ctx.fillStyle = gradeColor;
    ctx.font = "700 44px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(grade, badgeCx, badgeCy + 16);
    ctx.fillStyle = c.textFaint;
    ctx.font = "600 14px sans-serif";
    ctx.fillText("GRADE", badgeCx, badgeCy + 68);
    ctx.textAlign = "left";
  }

  if (traderAlias) {
    ctx.fillStyle = c.text;
    ctx.font = "700 30px sans-serif";
    ctx.fillText(traderAlias, 80, 160);
  }

  ctx.fillStyle = c.text;
  ctx.font = "700 58px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  ctx.fillText("MY TRADING WEEK", 80, traderAlias ? 226 : 196);

  ctx.fillStyle = c.textMuted;
  ctx.font = "400 24px sans-serif";
  ctx.fillText(`${rangeLabel} \u00b7 ${tradeCount} trade${tradeCount === 1 ? "" : "s"}`, 80, traderAlias ? 266 : 236);

  ctx.fillStyle = c.textFaint;
  ctx.font = "600 20px sans-serif";
  ctx.fillText("NET RETURN", 80, traderAlias ? 320 : 300);

  const numText = fmtPct(netPct);
  ctx.font = "700 96px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  const numWidth = ctx.measureText(numText).width;
  ctx.save();
  ctx.shadowColor = `${lineColor}AA`;
  ctx.shadowBlur = 32;
  ctx.fillStyle = lineColor;
  ctx.fillText(numText, 80, traderAlias ? 410 : 390);
  ctx.restore();

  const arrowUp = netPct >= 0;
  const pillX = 80 + numWidth + 26;
  const pillY = traderAlias ? 340 : 320;
  const pillW = 62;
  const pillH = 62;
  roundRect(pillX, pillY, pillW, pillH, 18);
  ctx.fillStyle = `${lineColor}22`;
  ctx.fill();
  ctx.strokeStyle = `${lineColor}66`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = lineColor;
  const pcx = pillX + pillW / 2;
  const pcy = pillY + pillH / 2;
  const s = 16;
  ctx.beginPath();
  if (arrowUp) {
    ctx.moveTo(pcx, pcy - s);
    ctx.lineTo(pcx + s, pcy + s * 0.6);
    ctx.lineTo(pcx - s, pcy + s * 0.6);
  } else {
    ctx.moveTo(pcx, pcy + s);
    ctx.lineTo(pcx + s, pcy - s * 0.6);
    ctx.lineTo(pcx - s, pcy - s * 0.6);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (showDollarAmount && Number.isFinite(netDollar)) {
    ctx.fillStyle = c.textMuted;
    ctx.font = "500 24px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${netDollar >= 0 ? "+" : "-"}$${fmtMoney(netDollar)}`, 80, 428);
  }

  const chartX = 80;
  const chartY = 440;
  const chartW = W - 160;
  const chartH = 320;

  roundRect(chartX, chartY, chartW, chartH, 20);
  ctx.fillStyle = c.surface;
  ctx.fill();
  ctx.save();
  ctx.shadowColor = `${lineColor}33`;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = `${lineColor}55`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  const padX = 40;
  const padY = 36;
  const plotX = chartX + padX;
  const plotY = chartY + padY;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;

  const values = curve.map((p) => p.pct);
  let minV = Math.min(0, ...values);
  let maxV = Math.max(0, ...values);
  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }
  const pad = (maxV - minV) * 0.15 || 1;
  minV -= pad;
  maxV += pad;

  const xFor = (i) => plotX + (curve.length > 1 ? (i / (curve.length - 1)) * plotW : plotW / 2);
  const yFor = (v) => plotY + plotH - ((v - minV) / (maxV - minV)) * plotH;

  ctx.strokeStyle = c.textFaint;
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plotX, yFor(0));
  ctx.lineTo(plotX + plotW, yFor(0));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(xFor(0), yFor(0));
  curve.forEach((p, i) => ctx.lineTo(xFor(i), yFor(p.pct)));
  ctx.lineTo(xFor(curve.length - 1), yFor(0));
  ctx.closePath();
  ctx.fillStyle = `${lineColor}40`;
  ctx.fill();

  ctx.beginPath();
  curve.forEach((p, i) => {
    const x = xFor(i);
    const y = yFor(p.pct);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.shadowColor = `${lineColor}AA`;
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.shadowBlur = 0;

  curve.forEach((p, i) => {
    if (i === 0) return;
    const x = xFor(i);
    const y = yFor(p.pct);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = c.bgTo;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = lineColor;
    ctx.stroke();
  });

  const lastX = xFor(curve.length - 1);
  const lastY = yFor(curve[curve.length - 1].pct);

  [22, 14].forEach((rr, idx) => {
    ctx.beginPath();
    ctx.arc(lastX, lastY, rr, 0, Math.PI * 2);
    ctx.strokeStyle = `${lineColor}${idx === 0 ? "22" : "44"}`;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.save();
  ctx.shadowColor = `${lineColor}CC`;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 9, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(lastX, lastY, 9, 0, Math.PI * 2);
  ctx.strokeStyle = c.dotRing;
  ctx.lineWidth = 3;
  ctx.stroke();

  const fmtRatioLocal = (n) => (Number.isFinite(n) ? n.toFixed(2) : "\u221e");

  // ---- plain stat chips (no icon badges) ----
  const drawChipRow = (y, stats, chipH = 110) => {
    const gap = 24;
    const chipW = (W - 160 - gap * 2) / 3;
    stats.forEach((s, i) => {
      const x = chartX + i * (chipW + gap);
      roundRect(x, y, chipW, chipH, 20);
      ctx.fillStyle = c.surface;
      ctx.fill();
      ctx.strokeStyle = s.accent ? `${s.color}66` : c.border;
      ctx.lineWidth = s.accent ? 2 : 1;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = c.textFaint;
      ctx.font = "600 15px sans-serif";
      ctx.fillText(s.label, x + chipW / 2, y + 34);

      ctx.fillStyle = s.color;
      ctx.font = `700 ${s.small ? 26 : 32}px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`;
      ctx.fillText(s.value, x + chipW / 2, y + (s.small ? 74 : 76));

      if (s.sub) {
        ctx.fillStyle = c.textFaint;
        ctx.font = "500 13px sans-serif";
        ctx.fillText(s.sub, x + chipW / 2, y + 96);
      }

      if (typeof s.bar === "number") {
        const barW = chipW - 32;
        const barX = x + 16;
        const barY = y + chipH - 20;
        roundRect(barX, barY, barW, 6, 3);
        ctx.fillStyle = `${s.color}22`;
        ctx.fill();
        const filled = Math.max(0.04, Math.min(1, s.bar));
        roundRect(barX, barY, barW * filled, 6, 3);
        ctx.fillStyle = s.color;
        ctx.fill();
      }

      ctx.textAlign = "left";
    });
    return y + chipH;
  };

  const row1Y = chartY + chartH + 44;
  const row1Bottom = drawChipRow(row1Y, [
    { label: "WIN RATE", value: `${fmt(winRate, 0)}%`, color: c.text },
    { label: "BEST STREAK", value: `+${bestStreak}`, color: c.green },
    { label: "WORST STREAK", value: `${worstStreak}`, color: worstStreak < 0 ? c.red : c.text },
  ]);

  const row2Y = row1Bottom + 20;
  const row2Bottom = drawChipRow(row2Y, [
    {
      label: "DISCIPLINE STREAK",
      value: `${disciplineStreak}d`,
      color: disciplineStreak > 0 ? c.green : c.textMuted,
    },
    {
      label: "TOP SETUP",
      value: topSetup ? topSetup.label : "\u2014",
      color: c.text,
      small: !!topSetup,
    },
    {
      label: "REVENGE TRADES",
      value: `${revengeCount}`,
      color: revengeCount > 0 ? c.red : c.green,
    },
  ]);

  const row3Y = row2Bottom + 20;
  const row3Bottom = drawChipRow(
    row3Y,
    [
      {
        label: "PROFIT FACTOR",
        value: fmtRatioLocal(profitFactor),
        color: Number.isFinite(profitFactor) && profitFactor >= 1.5 ? c.green : c.goldBright,
        sub: !Number.isFinite(profitFactor)
          ? "No losses"
          : profitFactor >= 2
          ? "Excellent"
          : profitFactor >= 1.5
          ? "Solid"
          : profitFactor >= 1
          ? "Breakeven+"
          : "Under 1.0",
      },
      {
        label: "TOP PAIR",
        value: topPair ? `${topPair.pair}` : "\u2014",
        color: c.goldBright,
        small: true,
        sub: topPair ? `${topPair.count} trade${topPair.count === 1 ? "" : "s"}` : undefined,
      },
      {
        label: "TRADE PACE",
        value: paceTrend || "Even",
        color: paceTrend === "Front-loaded" ? c.gold : paceTrend === "Back-loaded" ? c.goldBright : c.text,
        small: true,
        sub: "vs rest of week",
      },
    ],
    140
  );

  // ---- Deeper Stats ----
  const deeperTitleY = row3Bottom + 56;
  ctx.fillStyle = c.gold;
  roundRect(chartX, deeperTitleY - 20, 5, 26, 3);
  ctx.fill();
  ctx.fillStyle = c.textMuted;
  ctx.font = "600 22px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("DEEPER STATS", chartX + 18, deeperTitleY);

  const deeperRowY = deeperTitleY + 34;
  drawChipRow(
    deeperRowY,
    [
      {
        label: "RECOVERY FACTOR",
        value: fmtRatioLocal(recoveryFactor),
        color: Number.isFinite(recoveryFactor) && recoveryFactor >= 2 ? c.green : c.goldBright,
        sub: !Number.isFinite(recoveryFactor)
          ? "No drawdown"
          : recoveryFactor >= 4
          ? "Excellent"
          : recoveryFactor >= 2
          ? "Solid"
          : "Needs work",
      },
      {
        label: "CONSISTENCY",
        value: consistencyLabel || "\u2014",
        color:
          consistencyLabel === "Low"
            ? c.green
            : consistencyLabel === "Medium"
            ? c.gold
            : consistencyLabel === "High"
            ? c.red
            : c.textMuted,
        sub: consistencyLabel ? "Day-to-day volatility" : "Not enough data",
      },
      {
        label: "ACTIVE DAYS",
        value: `${activeDays}/7`,
        color: c.text,
        sub: "Days you traded",
      },
    ],
    140
  );

  ctx.fillStyle = c.textFaint;
  ctx.font = "400 20px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    showDollarAmount ? "Process metrics, with the numbers to back it up." : "No dollar amounts \u2014 just the process.",
    80,
    H - 70
  );

  ctx.textAlign = "right";
  ctx.fillStyle = c.goldBright;
  ctx.font = "600 22px -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  ctx.fillText("TREDZI", W - 80, H - 70);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}
