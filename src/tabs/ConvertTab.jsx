import { OnboardingTip } from "../components/onboarding.jsx";
import { CurrencySelect, Field, Readout, StatChip } from "../components/ui.jsx";
import { FX_RATES_PER_USD, FX_SNAPSHOT_LABEL } from "../data/currencies.js";
import { fmt, fmtThousands, num } from "../lib/format.js";
import { TAP, mono, palette } from "../lib/theme.js";
import { ArrowLeftRight, RotateCcw } from "lucide-react";

export default function ConvertTab(props) {
  const {
    fx,
    fxRatesDate,
    fxRatesStatus,
    isDesktop,
    liveFxRates,
    persistSettings,
    setFx,
    settings
  } = props;
  let body = null;
    const amount = num(fx.amount);
    const ratesSource = liveFxRates || FX_RATES_PER_USD;
    const perUsdFrom = ratesSource[fx.from] ?? FX_RATES_PER_USD[fx.from] ?? 1;
    const perUsdTo = ratesSource[fx.to] ?? FX_RATES_PER_USD[fx.to] ?? 1;
    const builtInRate = perUsdFrom > 0 ? perUsdTo / perUsdFrom : 0;
    const customRateNum = num(fx.customRate);
    const usingCustomRate = fx.customRate !== "" && customRateNum > 0;
    const effectiveRate = usingCustomRate ? customRateNum : builtInRate;
    const converted = amount * effectiveRate;
    const inverseRate = effectiveRate > 0 ? 1 / effectiveRate : 0;
    const sameCurrency = fx.from === fx.to;

    const swap = () => setFx({ ...fx, from: fx.to, to: fx.from, customRate: "" });

    body = (
      <>
        <OnboardingTip
          id="fx-rate-override-intro"
          text="Rates update once a day automatically. If your broker quotes something slightly different, paste it into Rate Override below for a precise conversion."
          settings={settings}
          persistSettings={persistSettings}
        />
        <Readout isDesktop={isDesktop}
          icon={ArrowLeftRight}
          eyebrow={`${fx.from} \u2192 ${fx.to}`}
          value={sameCurrency ? fmtThousands(amount) : fmtThousands(converted)}
          unit={fx.to}
          sub={
            sameCurrency
              ? "Same currency on both sides"
              : `1 ${fx.from} = ${fmt(effectiveRate, 4)} ${fx.to}, 1 ${fx.to} = ${fmt(inverseRate, 4)} ${fx.from}`
          }
        />
       <div className="lg:grid lg:grid-cols-2 lg:gap-4">
        <Field isDesktop={isDesktop} 
          label="Amount"
          value={fx.amount}
          suffix={fx.from}
          placeholder="100"
          onChange={(e) => setFx({ ...fx, amount: e.target.value })}
        />
       </div>

        <div className="flex items-end gap-2 mb-1">
          <CurrencySelect label="From" value={fx.from} onChange={(e) => setFx({ ...fx, from: e.target.value, customRate: "" })} />
          <button
            type="button"
            onClick={swap}
            className={`flex items-center justify-center rounded-lg flex-shrink-0 mb-4 ${TAP}`}
            style={{
              width: "44px",
              height: "48px",
              background: palette.field,
              border: `1px solid ${palette.border}`,
              color: palette.gold,
            }}
            aria-label="Swap currencies"
          >
            <ArrowLeftRight size={16} />
          </button>
          <CurrencySelect label="To" value={fx.to} onChange={(e) => setFx({ ...fx, to: e.target.value, customRate: "" })} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatChip isDesktop={isDesktop}
            label="Rate used"
            value={
              usingCustomRate
                ? "Custom"
                : fxRatesStatus === "live"
                ? "Live"
                : fxRatesStatus === "loading"
                ? "Loading\u2026"
                : `${FX_SNAPSHOT_LABEL} (offline)`
            }
          />
          <StatChip isDesktop={isDesktop} label={`${fx.to} per ${fx.from}`} value={fmt(effectiveRate, 4)} />
        </div>

        <div className="flex items-center justify-between mb-1.5">
          <span
            className="uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            Rate Override
          </span>
          {usingCustomRate && (
            <button
              type="button"
              onClick={() => setFx({ ...fx, customRate: "" })}
              className={`flex items-center gap-1 ${TAP}`}
              style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}
            >
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>
        <Field isDesktop={isDesktop} 
          label={`1 ${fx.from} =`}
          value={fx.customRate}
          suffix={fx.to}
          placeholder={fmt(builtInRate, 4)}
          onChange={(e) => setFx({ ...fx, customRate: e.target.value })}
        />
        <p className="text-xs -mt-2 mb-4" style={{ color: palette.textFaint }}>
          {fxRatesStatus === "live"
            ? `Live daily rates${fxRatesDate ? ` as of ${fxRatesDate}` : ""}. Updated once a day, not intraday.`
            : fxRatesStatus === "loading"
            ? "Fetching today's live rates\u2026"
            : `Couldn't reach the live rate feed, showing the ${FX_SNAPSHOT_LABEL} fallback snapshot instead.`}{" "}
          For anything that matters, check your bank or exchange's current rate and paste it above to convert
          precisely.
        </p>
      </>
    );
  
  return body;
}
