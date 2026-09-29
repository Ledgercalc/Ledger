import { pad2 } from "./format.js";

// Session hours are defined in each market's own local time and converted to UTC using the
// market's *current* daylight-saving offset, so they stay correct across DST changes.
//   London   08:00-17:00 London time   (UTC 8-17 in winter, 7-16 in summer)
//   New York 08:00-17:00 New York time (UTC 13-22 in winter, 12-21 in summer)
//   Asia     Sydney 08:00 -> Tokyo 18:00 (UTC 22-9 in Australian winter, 21-9 in Australian summer)
export const _tzFmtCache = {};

export const _tzShiftCache = {};

export function tzDstShiftHours(timeZone, standardOffsetHours) {
  // How many hours the zone is currently ahead of its standard (non-DST) offset: 0 or 1.
  const nowMs = Date.now();
  const hit = _tzShiftCache[timeZone];
  if (hit && nowMs - hit.ts < 60000) return hit.value;
  let value = 0;
  try {
    if (!_tzFmtCache[timeZone]) {
      _tzFmtCache[timeZone] = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    const parts = _tzFmtCache[timeZone].formatToParts(new Date(nowMs));
    const g = (t) => Number(parts.find((x) => x.type === t).value);
    const asUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
    const offsetHours = Math.round((asUTC - Math.floor(nowMs / 1000) * 1000) / 1800000) / 2;
    value = offsetHours - standardOffsetHours;
  } catch (err) {
    value = 0; // fall back to winter hours if Intl time zones are unavailable
  }
  _tzShiftCache[timeZone] = { ts: nowMs, value };
  return value;
}

export const MARKET_SESSIONS = [
  {
    id: "asia", label: "Asia", color: "#6C8EBF",
    get startUTC() { return mod24(22 - tzDstShiftHours("Australia/Sydney", 10)); },
    get endUTC() { return 9; },
  },
  {
    id: "london", label: "London", color: "#6CBF8E",
    get startUTC() { return 8 - tzDstShiftHours("Europe/London", 0); },
    get endUTC() { return 17 - tzDstShiftHours("Europe/London", 0); },
  },
  {
    id: "newyork", label: "New York", color: "#BFA26C",
    get startUTC() { return 13 - tzDstShiftHours("America/New_York", -5); },
    get endUTC() { return mod24(22 - tzDstShiftHours("America/New_York", -5)); },
  },
];

export function mod24(h) {
  return ((h % 24) + 24) % 24;
}

export function sessionOpenAtUTCHour(session, hourUTC) {
  const h = mod24(hourUTC);
  if (session.startUTC <= session.endUTC) {
    return h >= session.startUTC && h < session.endUTC;
  }
  return h >= session.startUTC || h < session.endUTC;
}

export function sessionOpenAtLocalHour(session, localHour, tzOffsetMinutes) {
  return sessionOpenAtUTCHour(session, localHour + tzOffsetMinutes / 60);
}

export function sessionLocalSegments(session, tzOffsetMinutes) {
  const localStart = mod24(session.startUTC - tzOffsetMinutes / 60);
  const localEnd = mod24(session.endUTC - tzOffsetMinutes / 60);
  if (localStart <= localEnd) return [[localStart, localEnd]];
  return [
    [localStart, 24],
    [0, localEnd],
  ];
}

export function formatHourLabel(hourFrac) {
  const h = mod24(hourFrac);
  const totalMin = Math.round(h * 60) % 1440;
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  const period = hh < 12 ? "AM" : "PM";
  let displayHour = hh % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour}${mm > 0 ? ":" + pad2(mm) : ""} ${period}`;
}

export function sessionCountdown(session, nowUTCHour) {
  const isOpen = sessionOpenAtUTCHour(session, nowUTCHour);
  if (isOpen) {
    let close = session.endUTC;
    if (close <= nowUTCHour) close += 24;
    return { isOpen, hours: close - nowUTCHour };
  }
  let open = session.startUTC;
  if (open <= nowUTCHour) open += 24;
  return { isOpen, hours: open - nowUTCHour };
}

export function highLiquidityWindowLocal(tzOffsetMinutes) {
  const london = MARKET_SESSIONS.find((s) => s.id === "london");
  const newyork = MARKET_SESSIONS.find((s) => s.id === "newyork");
  return {
    startLocal: mod24(newyork.startUTC - tzOffsetMinutes / 60),
    endLocal: mod24(london.endUTC - tzOffsetMinutes / 60),
  };
}
