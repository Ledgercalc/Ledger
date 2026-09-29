import { OnboardingTip } from "../components/onboarding.jsx";
import { Readout } from "../components/ui.jsx";
import { RUNTIME } from "../lib/constants.js";
import { MARKET_SESSIONS, formatHourLabel, highLiquidityWindowLocal, mod24, sessionCountdown, sessionLocalSegments, sessionOpenAtLocalHour } from "../lib/sessions.js";
import { TAP, THEME_TRANSITION, mono, palette } from "../lib/theme.js";
import { formatCountdown, nextOccurrenceMs } from "../lib/time.js";
import { Bell, Clock, Newspaper, Trash2 } from "lucide-react";

export default function SessionsTab(props) {
  const {
    addNewsEvent,
    currentTime,
    deleteNewsEvent,
    econError,
    econEvents,
    econStatus,
    isDesktop,
    loadEconomicCalendar,
    newEventAlarm,
    newEventDate,
    newEventImpact,
    newEventName,
    newEventTime,
    newsEvents,
    newsLoadError,
    newsLoaded,
    notifPermission,
    persistSettings,
    renderSubNav,
    sessionsSubTab,
    setNewEventDate,
    setNewEventImpact,
    setNewEventName,
    setNewEventTime,
    setSessionsSubTab,
    settings,
    toggleNewEventAlarm
  } = props;
  let body = null;
    const SESSIONS_SUB_TABS = [
      { id: "sessions", label: "Sessions" },
      { id: "news", label: "News" },
    ];

    const sessionsSubNav = renderSubNav(SESSIONS_SUB_TABS, sessionsSubTab, setSessionsSubTab);

    let newsBody = null;
    {
      const now = new Date();
      const withOcc = newsEvents.map((ev) => ({ ev, occMs: nextOccurrenceMs(ev, now) }));

      const future = withOcc.filter((x) => x.occMs >= now.getTime()).sort((a, b) => a.occMs - b.occMs);
      const next = future[0];
      const nextMs = next ? next.occMs - now.getTime() : Infinity;
      const nextLabel = next ? `${next.ev.date} ${next.ev.time}` : "";

      const impactColor = (level) =>
        level === "high" ? palette.red : level === "medium" ? palette.goldBright : palette.textMuted;

      const dayGroups = {};
      withOcc.forEach(({ ev, occMs }) => {
        const d = new Date(occMs);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!dayGroups[key]) dayGroups[key] = [];
        dayGroups[key].push({ ev, occMs });
      });
      const dayKeys = Object.keys(dayGroups).sort();

      newsBody = (
        <>
          <Readout
            icon={Newspaper}
            eyebrow="Next USD Event"
            value={next ? formatCountdown(nextMs) : "N/A"}
            sub={next ? `${next.ev.name}  ${nextLabel}` : "No upcoming events, add one below"}
            tone={next && next.ev.impact === "high" && nextMs < 60 * 60 * 1000 ? "bad" : undefined}
          />

          {newsLoadError && (
            <p className="text-xs mb-4" style={{ color: palette.red }}>
              {newsLoadError}
            </p>
          )}

          {notifPermission === "denied" && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              Notifications are blocked in your browser settings alarms will still ring with sound while this
              app is open, just without a system notification.
            </p>
          )}

          {!newsLoaded ? (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              Loading saved events\u2026
            </p>
          ) : newsEvents.length === 0 ? (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              No events added yet. Add one below to start tracking it.
            </p>
          ) : (
            dayKeys.map((key) => {
              const dayDate = new Date(`${key}T00:00:00`);
              const dayLabel = dayDate.toLocaleDateString("default", {
                weekday: "long",
                month: "short",
                day: "numeric",
              });
              const isPast = dayGroups[key].every((x) => x.occMs < now.getTime());
              return (
                <div key={key} className="mb-4">
                  <div
                    className="uppercase mb-1.5"
                    style={{
                      color: isPast ? palette.textFaint : palette.textMuted,
                      letterSpacing: "0.08em",
                      fontSize: "11px",
                    }}
                  >
                    {dayLabel}
                  </div>
                  {dayGroups[key]
                    .sort((a, b) => a.ev.time.localeCompare(b.ev.time))
                    .map(({ ev, occMs }) => {
                      const passed = occMs < now.getTime();
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
                          style={{
                            background: palette.surface,
                            border: `1px solid ${palette.border}`,
                            boxShadow: palette.shadow,
                            opacity: passed ? 0.55 : 1,
                            transition: THEME_TRANSITION,
                          }}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span style={{ color: palette.text, fontSize: "14px" }}>{ev.name}</span>
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontFamily: mono,
                                  color: impactColor(ev.impact),
                                  border: `1px solid ${impactColor(ev.impact)}`,
                                  borderRadius: "999px",
                                  padding: "1px 6px",
                                  textTransform: "uppercase",
                                }}
                              >
                                {ev.impact}
                              </span>
                              {ev.alarm && <Bell size={11} style={{ color: palette.gold }} aria-label="Alarm set" />}
                            </div>
                            <div style={{ color: palette.textMuted, fontSize: "12px" }}>
                              {ev.time}
                              {passed ? ", released" : ""}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteNewsEvent(ev.id)}
                            className={TAP}
                            style={{ color: palette.textFaint }}
                            aria-label="Delete event"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      );
                    })}
                </div>
              );
            })
          )}

          <p className="text-xs mt-1 mb-6" style={{ color: palette.textFaint }}>
            Nothing here is added automatically add the events you want to track below. With Alarm on, this
            app rings (sound + notification) {RUNTIME.ALARM_LEAD_MINUTES} minutes before, but only while it's open in your
            browser it can't set a true system alarm, so keep the tab open (or this installed as a
            home-screen app) close to the event.
          </p>

          <div className="flex items-center justify-between mb-1.5">
            <span
              className="uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Economic Calendar — This Week
            </span>
            <button
              type="button"
              onClick={loadEconomicCalendar}
              className={TAP}
              style={{ color: palette.gold, fontSize: "11px", fontFamily: mono }}
            >
              Refresh
            </button>
          </div>

          {econStatus === "loading" && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              Loading economic calendar\u2026
            </p>
          )}
          {econStatus === "error" && (
            <p className="text-xs mb-4" style={{ color: palette.red }}>
              {econError}
            </p>
          )}
          {econStatus === "live" && econEvents.length === 0 && (
            <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
              No high-impact USD events found for this month.
            </p>
          )}

          {econEvents.map((ev) => {
            const evDate = new Date(ev.date.replace(" ", "T"));
            const released = ev.actual !== null && ev.actual !== undefined && ev.actual !== "";
            return (
              <div
                key={ev.id}
                className="rounded-lg px-3 py-2.5 mb-2"
                style={{
                  background: palette.surface,
                  border: `1px solid ${palette.border}`,
                  boxShadow: palette.shadow,
                  opacity: released ? 0.7 : 1,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: palette.text, fontSize: "13px" }}>{ev.name}</span>
                  <span
                    style={{
                      fontSize: "9px",
                      fontFamily: mono,
                      color:
                        ev.impact === "high" ? palette.red : ev.impact === "medium" ? palette.goldBright : palette.textMuted,
                      border: `1px solid ${
                        ev.impact === "high" ? palette.red : ev.impact === "medium" ? palette.goldBright : palette.textMuted
                      }`,
                      borderRadius: "999px",
                      padding: "1px 6px",
                      textTransform: "uppercase",
                      flexShrink: 0,
                      marginLeft: "8px",
                    }}
                  >
                    {ev.impact}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: palette.textFaint, fontSize: "11px" }}>
                    {evDate.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span style={{ fontFamily: mono, fontSize: "10px", color: palette.textMuted }}>
                    {ev.previous != null && `Prev ${ev.previous}`}
                    {ev.estimate != null && `  Est ${ev.estimate}`}
                    {ev.actual != null && `  Actual ${ev.actual}`}
                  </span>
                </div>
              </div>
            );
          })}

          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Shows this week's upcoming US releases — filtered to CPI, PPI, FOMC, NFP, GDP, and similar
            high-medium impact events. This is separate from the alarm calendar below — add specific events there for
            a countdown/alarm.
          </p>

          <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
            Add Event
          </span>
          <label className="block mb-4">
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Event Name
            </span>
            <div
              className="flex items-center rounded-lg px-3"
              style={{ background: palette.field, border: `1px solid ${palette.border}` }}
            >
              <input
                type="text"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="Non-Farm Payrolls"
                className="w-full bg-transparent py-3 outline-none"
                style={{ color: palette.text, fontFamily: mono, fontSize: "16px" }}
              />
            </div>
          </label>

          <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
            Impact
          </span>
          <div className="flex gap-2 mb-4">
            {["high", "medium", "low"].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setNewEventImpact(lvl)}
                className={`px-3 py-1.5 rounded-full transition-colors ${TAP}`}
                style={{
                  background: newEventImpact === lvl ? impactColor(lvl) : palette.field,
                  color: newEventImpact === lvl ? palette.letterbox : palette.textMuted,
                  border: `1px solid ${newEventImpact === lvl ? impactColor(lvl) : palette.border}`,
                  fontFamily: mono,
                  fontSize: "13px",
                  textTransform: "capitalize",
                }}
              >
                {lvl}
              </button>
            ))}
          </div>

          <label className="block mb-4">
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Date
            </span>
            <div
              className="rounded-lg px-3"
              style={{ background: palette.field, border: `1px solid ${palette.border}` }}
            >
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="w-full bg-transparent py-3 outline-none"
                style={{ color: palette.text, fontFamily: mono, fontSize: "15px" }}
              />
            </div>
          </label>

          <label className="block mb-4">
            <span
              className="block mb-1.5 uppercase"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
            >
              Time (local)
            </span>
            <div
              className="rounded-lg px-3"
              style={{ background: palette.field, border: `1px solid ${palette.border}` }}
            >
              <input
                type="time"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                className="w-full bg-transparent py-3 outline-none"
                style={{ color: palette.text, fontFamily: mono, fontSize: "15px" }}
              />
            </div>
          </label>

          <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
            Alarm
          </span>
          <button
            type="button"
            onClick={toggleNewEventAlarm}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg mb-1 transition-colors ${TAP}`}
            style={{
              background: newEventAlarm ? palette.gold : palette.field,
              color: newEventAlarm ? palette.letterbox : palette.textMuted,
              border: `1px solid ${newEventAlarm ? palette.gold : palette.border}`,
              fontFamily: mono,
              fontSize: "13px",
            }}
          >
            <Bell size={15} />
            {newEventAlarm ? `Ring ${RUNTIME.ALARM_LEAD_MINUTES} min before` : "No alarm for this event"}
          </button>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            {notifPermission === "granted"
              ? "Notifications are allowed \u2014 you'll get a system notification plus sound when it rings."
              : notifPermission === "unsupported"
              ? "This browser doesn't support notifications \u2014 the alarm will still ring with sound and an in-app popup."
              : "Turning this on will ask for notification permission."}
          </p>

          <button
            type="button"
            onClick={addNewsEvent}
            className={`w-full rounded-lg py-3 mb-4 ${TAP}`}
            style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "14px", transition: `${THEME_TRANSITION}, transform 0.15s ease` }}
          >
            + Add Event
          </button>
        </>
      );
    }

    let sessionsBody = null;
    {
      const tzOffsetMinutes = currentTime.getTimezoneOffset();
      const nowUTCHour =
        currentTime.getUTCHours() + currentTime.getUTCMinutes() / 60 + currentTime.getUTCSeconds() / 3600;
      const localTimeLabel = currentTime.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      let tzName = "";
      try {
        tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      } catch (err) {
        tzName = "";
      }

      const sessionStates = MARKET_SESSIONS.map((s) => ({
        ...s,
        ...sessionCountdown(s, nowUTCHour),
        segments: sessionLocalSegments(s, tzOffsetMinutes),
      }));
      const openSessions = sessionStates.filter((s) => s.isOpen);

      const { startLocal: hlStart, endLocal: hlEnd } = highLiquidityWindowLocal(tzOffsetMinutes);
      const highLiquidityActive =
        openSessions.some((s) => s.id === "london") && openSessions.some((s) => s.id === "newyork");

      const overlapSlots = [];
      for (let i = 0; i < 48; i++) {
        const localHour = i / 2;
        const openIds = MARKET_SESSIONS.filter((s) =>
          sessionOpenAtLocalHour(s, localHour, tzOffsetMinutes)
        ).map((s) => s.id);
        overlapSlots.push({ localHour, count: openIds.length, openIds });
      }

      const nowLocalHour = mod24(nowUTCHour - tzOffsetMinutes / 60);
      const HOUR_TICKS = [0, 4, 8, 12, 16, 20];

      sessionsBody = (
        <>
          <OnboardingTip
            id="sessions-overlap-intro"
            text="The gold strip under the timeline marks session overlaps — that's usually when volume and volatility are highest."
            settings={settings}
            persistSettings={persistSettings}
          />
          <Readout
            icon={Clock}
            eyebrow="Your Local Time"
            value={localTimeLabel}
            sub={
              openSessions.length > 0
                ? `${openSessions.map((s) => s.label).join(", ")} open now${
                    highLiquidityActive ? " \u2014 highest liquidity window" : ""
                  }`
                : "No major session open right now"
            }
            tone={highLiquidityActive ? "good" : undefined}
          />

          <div
            className={isDesktop ? "rounded-2xl p-6 mb-2" : "rounded-2xl p-4 mb-2"}
            style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
          >
            <div
              className="uppercase mb-3"
              style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: isDesktop ? "13px" : "11px" }}
            >
              Session Timeline (Local Time)
            </div>

            {sessionStates.map((s) => (
              <div key={s.id} className="flex items-center mb-2" style={{ gap: isDesktop ? "12px" : "8px" }}>
                <span
                  style={{ width: isDesktop ? "90px" : "62px", flexShrink: 0, fontSize: isDesktop ? "13px" : "11px", fontFamily: mono, color: palette.textMuted }}
                >
                  {s.label}
                </span>
                <div className="relative flex-1" style={{ height: isDesktop ? "26px" : "16px" }}>
                  <div
                    className="absolute inset-0 rounded"
                    style={{ background: palette.field, border: `1px solid ${palette.border}` }}
                  />
                  {s.segments.map((seg, i) => (
                    <div
                      key={i}
                      className="absolute rounded"
                      style={{
                        top: 0,
                        bottom: 0,
                        left: `${(seg[0] / 24) * 100}%`,
                        width: `${((seg[1] - seg[0]) / 24) * 100}%`,
                        background: s.color,
                        opacity: s.isOpen ? 0.85 : 0.4,
                      }}
                    />
                  ))}
                  <div
                    className="absolute"
                    style={{
                      top: "-3px",
                      bottom: "-3px",
                      left: `${(nowLocalHour / 24) * 100}%`,
                      width: "2px",
                      background: palette.goldBright,
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="flex items-center mb-1" style={{ gap: "8px" }}>
              <span style={{ width: "62px", flexShrink: 0 }} />
              <div className="relative flex-1" style={{ height: "8px" }}>
                {overlapSlots.map((slot, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      top: 0,
                      bottom: 0,
                      left: `${(slot.localHour / 24) * 100}%`,
                      width: `${(1 / 48) * 100}%`,
                      background:
                        slot.count >= 2
                          ? slot.openIds.includes("london") && slot.openIds.includes("newyork")
                            ? palette.goldBright
                            : `${palette.gold}88`
                          : "transparent",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center" style={{ gap: "8px" }}>
              <span style={{ width: "62px", flexShrink: 0 }} />
              <div className="relative flex-1" style={{ height: "12px" }}>
                {HOUR_TICKS.map((h) => (
                  <span
                    key={h}
                    className="absolute"
                    style={{
                      left: `${(h / 24) * 100}%`,
                      transform: "translateX(-50%)",
                      fontSize: "9px",
                      fontFamily: mono,
                      color: palette.textFaint,
                    }}
                  >
                    {formatHourLabel(h)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs mb-4" style={{ color: palette.textFaint }}>
            Gold marker is right now. The strip under the bars highlights overlaps – brighter gold marks
            London and New York trading at once, the day's highest-liquidity window.
          </p>

          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: palette.surface, border: `1px solid ${palette.gold}`, boxShadow: palette.shadow }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} style={{ color: palette.gold }} />
              <span className="uppercase" style={{ color: palette.gold, letterSpacing: "0.08em", fontSize: "10px" }}>
                Highest Liquidity Window
              </span>
            </div>
            <div style={{ color: palette.text, fontSize: "13px" }}>
              London &amp; New York overlap, {formatHourLabel(hlStart)} – {formatHourLabel(hlEnd)} your time
              {highLiquidityActive ? " \u2014 active right now." : "."}
            </div>
          </div>

          <span
            className="block mb-1.5 uppercase"
            style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}
          >
            Session Status
          </span>
          {sessionStates.map((s) => {
            const seg = s.segments;
            const rangeStart = seg[0][0];
            const rangeEnd = seg.length === 1 ? seg[0][1] : seg[1][1];
            const rangeLabel = `${formatHourLabel(rangeStart)} – ${formatHourLabel(rangeEnd)}`;
            const countdownLabel = formatCountdown(s.hours * 3600000);
            return (
              <div
                key={s.id}
                className={isDesktop ? "flex items-center justify-between rounded-lg px-5 py-4 mb-3" : "flex items-center justify-between rounded-lg px-3 py-3 mb-2"}
                style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, transition: THEME_TRANSITION }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full flex-shrink-0"
                    style={{ width: isDesktop ? "10px" : "8px", height: isDesktop ? "10px" : "8px", background: s.color }}
                  />
                  <div>
                    <div style={{ color: palette.text, fontSize: isDesktop ? "16px" : "14px", marginBottom: "2px" }}>{s.label}</div>
                    <div style={{ color: palette.textMuted, fontSize: isDesktop ? "14px" : "12px" }}>{rangeLabel}</div>
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: "11px",
                    letterSpacing: "0.06em",
                    color: s.isOpen ? palette.green : palette.textFaint,
                    border: `1px solid ${s.isOpen ? palette.green : palette.border}`,
                    borderRadius: "999px",
                    padding: "3px 8px",
                    flexShrink: 0,
                    marginLeft: "8px",
                    textAlign: "right",
                  }}
                >
                  {s.isOpen ? `OPEN \u00b7 ${countdownLabel} left` : `OPENS IN ${countdownLabel}`}
                </span>
              </div>
            );
          })}

          <p className="text-xs mt-2 mb-4" style={{ color: palette.textFaint }}>
            Standard session hours in UTC: Asia 22:00–09:00, London 08:00–17:00,
            New York 13:00–22:00. Shown here converted to your device's local time (
            {tzName || "detected automatically"}), not adjusted for daylight saving.
          </p>

          <button
            type="button"
            onClick={() => setSessionsSubTab("news")}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 mb-4 ${TAP}`}
            style={{
              background: palette.field,
              border: `1px solid ${palette.border}`,
              color: palette.text,
              fontFamily: mono,
              fontSize: "13px",
              fontWeight: 600,
              transition: `${THEME_TRANSITION}, transform 0.15s ease`,
            }}
          >
            <Newspaper size={16} />
            Check Today's News Events
          </button>
        </>
      );
    }

    body = (
      <>
        {sessionsSubNav}
        {sessionsSubTab === "sessions" ? sessionsBody : newsBody}
      </>
    );
  
  return body;
}
