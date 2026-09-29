import { CURRENCY_CODES, CURRENCY_NAMES } from "../data/currencies.js";
import { avatarStyleFor, getInitials } from "../lib/feed.js";
import { TAP, THEME_TRANSITION, display, mono, palette } from "../lib/theme.js";
import { ChevronDown, Info } from "lucide-react";
import { useState } from "react";

export function Field({ label, value, onChange, suffix, placeholder, readOnly, isDesktop }) {
  return (
    <label className="block mb-4">
      <span
        className="block mb-1.5 uppercase"
        style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px", transition: THEME_TRANSITION }}
      >
        {label}
      </span>
      <div
        className="flex items-center px-3.5"
        style={{
          background: readOnly ? palette.surface : palette.field,
          border: `1px solid ${palette.border}`,
          borderRadius: "12px",
          transition: `${THEME_TRANSITION}, border-color 0.15s ease`,
        }}
        onFocusCapture={(e) => { e.currentTarget.style.borderColor = palette.gold; }}
        onBlurCapture={(e) => { e.currentTarget.style.borderColor = palette.border; }}
      >
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          className={isDesktop ? "w-full bg-transparent py-4 outline-none" : "w-full bg-transparent py-3 outline-none"}
          style={{
            color: readOnly ? palette.textMuted : palette.text,
            fontFamily: mono,
            fontSize: isDesktop ? "18px" : "16px",
            cursor: readOnly ? "default" : "text",
            transition: THEME_TRANSITION,
          }}
        />
        {suffix && (
          <span className="text-sm pl-2" style={{ color: palette.textFaint, transition: THEME_TRANSITION }}>
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

export function CurrencySelect({ label, value, onChange }) {
  return (
    <label className="block mb-4 flex-1">
      <span
        className="block mb-1.5 uppercase"
        style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px", transition: THEME_TRANSITION }}
      >
        {label}
      </span>
      <div
        className="rounded-lg px-3"
        style={{ background: palette.field, border: `1px solid ${palette.border}`, transition: THEME_TRANSITION }}
      >
        <select
          value={value}
          onChange={onChange}
          className="w-full bg-transparent py-3 outline-none appearance-none"
          style={{ color: palette.text, fontFamily: mono, fontSize: "15px", transition: THEME_TRANSITION }}
        >
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code} style={{ background: palette.field, color: palette.text }}>
              {code} — {CURRENCY_NAMES[code]}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

export function SettingsSection({ icon: Icon, title, description, danger, children, defaultOpen = false, isDesktop = true, hidden = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const locked = !isDesktop;
  const isOpen = locked ? true : open;
  const accent = danger ? palette.red : palette.gold;
  return (
    <div
      className="mb-4 overflow-hidden"
      style={{
        background: danger ? `${palette.red}0A` : palette.field,
        border: `1px solid ${danger ? `${palette.red}55` : palette.border}`,
        borderRadius: "16px",
        transition: THEME_TRANSITION,
        breakInside: "avoid",
        WebkitColumnBreakInside: "avoid",
        display: hidden ? "none" : "inline-block",
        width: "100%",
        verticalAlign: "top",
      }}
    >
      <button
        type="button"
        onClick={locked ? undefined : () => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-4 text-left"
        style={{ background: "transparent", cursor: locked ? "default" : "pointer" }}
      >
        {Icon && (
          <span
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              width: "28px",
              height: "28px",
              background: `${accent}1E`,
              color: accent,
            }}
          >
            <Icon size={14} strokeWidth={2.2} />
          </span>
        )}
        <span
          style={{
            fontFamily: display,
            fontSize: "12.5px",
            fontWeight: 700,
            color: danger ? palette.red : palette.text,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          {title}
        </span>
        {!locked && (
          <ChevronDown
            size={16}
            style={{
              color: palette.textFaint,
              flexShrink: 0,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {description && (
            <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
              {description}
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

export function SettingsSubLabel({ children }) {
  return (
    <span
      className="block mb-1.5 uppercase"
      style={{ color: palette.textMuted, letterSpacing: "0.07em", fontSize: "10.5px", fontWeight: 600 }}
    >
      {children}
    </span>
  );
}

export function StatChip({ label, value, onClick, isDesktop }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`p-3.5 ${onClick ? `${TAP}` : ""}`}
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: "14px",
        boxShadow: palette.shadow,
        cursor: onClick ? "pointer" : "default",
        transition: `${THEME_TRANSITION}, box-shadow 0.15s ease, border-color 0.15s ease`,
      }}
    >
      <div
        className="uppercase mb-1.5 flex items-center gap-1"
        style={{ color: palette.textFaint, letterSpacing: "0.07em", fontSize: "10.5px", fontWeight: 600, transition: THEME_TRANSITION }}
      >
        {label}
        {onClick && <Info size={10} style={{ opacity: 0.7, flexShrink: 0 }} />}
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: isDesktop ? "1.4rem" : "1.08rem",
          fontWeight: 600,
          color: palette.text,
          fontVariantNumeric: "tabular-nums",
          transition: THEME_TRANSITION,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function Avatar({ name, size = 40, ring, online, src }) {
  const a = avatarStyleFor(name || "?");
  return (
    <span className="relative inline-flex flex-shrink-0" style={{ width: `${size}px`, height: `${size}px` }}>
      {src ? (
        <img
          src={src}
          alt={name || "avatar"}
          className="rounded-full w-full h-full"
          style={{
            objectFit: "cover",
            boxShadow: ring ? `0 0 0 2px ${palette.surface}, 0 0 0 3.5px ${palette.gold}66` : "0 2px 6px rgba(0,0,0,0.25)",
          }}
        />
      ) : (
        <span
          className="flex items-center justify-center rounded-full w-full h-full"
          style={{
            background: a.bg,
            color: a.fg,
            fontFamily: mono,
            fontWeight: 800,
            fontSize: `${Math.round(size * 0.38)}px`,
            boxShadow: ring ? `0 0 0 2px ${palette.surface}, 0 0 0 3.5px ${palette.gold}66` : "0 2px 6px rgba(0,0,0,0.25)",
          }}
        >
          {getInitials(name)}
        </span>
      )}
      {online && (
        <span
          style={{
            position: "absolute",
            bottom: "-1px",
            right: "-1px",
            width: `${Math.max(9, size * 0.26)}px`,
            height: `${Math.max(9, size * 0.26)}px`,
            borderRadius: "999px",
            background: palette.green,
            border: `2px solid ${palette.surface}`,
          }}
        />
      )}
    </span>
  );
}

export function PillGroup({ options, value, onChange, suffix = "%" }) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(String(opt))}
          className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
          style={{
            background: String(value) === String(opt) ? palette.gold : palette.field,
            color: String(value) === String(opt) ? palette.letterbox : palette.textMuted,
            border: `1px solid ${String(value) === String(opt) ? palette.gold : palette.border}`,
            fontFamily: mono,
            fontSize: "13px",
          }}
        >
          {opt}
          {suffix}
        </button>
      ))}
    </div>
  );
}

export function RuleRow({ label, detail, pass }) {
  const color = pass === undefined ? palette.textFaint : pass ? palette.green : palette.red;
  const badge = pass === undefined ? "N/A" : pass ? "OK" : "OVER";
  return (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-3 mb-2"
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderLeft: `3px solid ${pass === undefined ? palette.border : pass ? palette.green : palette.red}`,
        boxShadow: palette.shadow,
        transition: THEME_TRANSITION,
      }}
    >
      <div>
        <div style={{ color: palette.text, fontSize: "14px", marginBottom: "2px", transition: THEME_TRANSITION }}>{label}</div>
        <div style={{ color: palette.textMuted, fontSize: "12px", transition: THEME_TRANSITION }}>{detail}</div>
      </div>
      <span
        style={{
          fontFamily: mono,
          fontSize: "11px",
          letterSpacing: "0.06em",
          color,
          border: `1px solid ${color}`,
          borderRadius: "999px",
          padding: "3px 8px",
          flexShrink: 0,
          marginLeft: "8px",
          transition: THEME_TRANSITION,
        }}
      >
        {badge}
      </span>
    </div>
  );
}

export function Readout({ eyebrow, value, unit, sub, tone, isDesktop, rightContent, icon: Icon, progress, statusLabel, statLeft, statRight }) {
  const toneColor =
    tone === "good" ? palette.green : tone === "bad" ? palette.red : palette.goldBright;
  const hasProgress = typeof progress === "number" && !Number.isNaN(progress);
  const progressPct = hasProgress ? Math.max(0, Math.min(100, progress)) : 0;
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 mb-6"
      style={{
        background: `linear-gradient(165deg, ${palette.surface} 0%, ${palette.field} 130%)`,
        border: `1px solid ${palette.border}`,
        borderRadius: "18px",
        boxShadow: `${palette.shadow}, inset 0 1px 0 ${palette.text}08`,
        "--glow": palette.glow,
        transition: THEME_TRANSITION,
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0"
        aria-hidden="true"
        style={{ width: "3px", background: toneColor }}
      />
      <div className="relative flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "9px",
                background: `${toneColor}1F`,
                border: `1px solid ${toneColor}33`,
              }}
            >
              <Icon size={15} style={{ color: toneColor }} strokeWidth={2.25} />
            </div>
          )}
          <div
            className="uppercase truncate"
            style={{ color: palette.textMuted, letterSpacing: "0.12em", fontSize: "11px", fontWeight: 600, transition: THEME_TRANSITION }}
          >
            {eyebrow}
          </div>
          {statusLabel && isDesktop && (
            <span
              className="flex-shrink-0"
              style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "0.05em", color: toneColor, transition: THEME_TRANSITION }}
            >
              &#9679; {statusLabel}
            </span>
          )}
        </div>
        {rightContent && isDesktop && (
          <div className="text-right flex-shrink-0" style={{ marginLeft: "8px" }}>
            {rightContent}
          </div>
        )}
      </div>
      <div className="relative flex items-baseline gap-2 ticker-glow">
        <span
          style={{
            fontFamily: mono,
            fontSize: isDesktop ? "3.2rem" : "2.15rem",
            fontWeight: 600,
            color: toneColor,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            transition: THEME_TRANSITION,
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontFamily: mono, fontSize: "1rem", color: palette.textMuted, transition: THEME_TRANSITION }}>
            {unit}
          </span>
        )}
      </div>
      {hasProgress && (
        <div
          className="relative mt-3"
          style={{ height: "6px", borderRadius: "999px", background: palette.field, border: `1px solid ${palette.border}`, overflow: "hidden" }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              borderRadius: "999px",
              background: `linear-gradient(90deg, ${toneColor}99, ${toneColor})`,
              boxShadow: `0 0 8px ${toneColor}77`,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      )}
      {(statLeft || statRight) && (
        <div className="relative flex items-center mt-3.5">
          {statLeft && (
            <div style={{ flex: 1, fontFamily: mono, fontSize: "15px", fontWeight: 600, color: toneColor, fontVariantNumeric: "tabular-nums" }}>
              {statLeft.value}
              {statLeft.unit && (
                <span style={{ fontSize: "11px", color: palette.textFaint, fontWeight: 400 }}> {statLeft.unit}</span>
              )}
            </div>
          )}
          {statLeft && statRight && (
            <div style={{ width: "1px", alignSelf: "stretch", background: palette.border, margin: "0 14px" }} />
          )}
          {statRight && (
            <div
              style={{
                flex: 1,
                textAlign: statLeft ? "right" : "left",
                fontFamily: mono,
                fontSize: "15px",
                fontWeight: 600,
                color: palette.green,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {statRight.value}
              {statRight.unit && (
                <span style={{ fontSize: "11px", color: palette.textFaint, fontWeight: 400 }}> {statRight.unit}</span>
              )}
            </div>
          )}
        </div>
      )}
      {sub && (
        <div className="relative mt-2 text-sm" style={{ color: palette.textMuted, transition: THEME_TRANSITION }}>
          {sub}
        </div>
      )}
      {rightContent && !isDesktop && (
        <div
          className="relative mt-3 pt-3"
          style={{ borderTop: `1px dashed ${palette.border}` }}
        >
          {rightContent}
        </div>
      )}
    </div>
  );
}
