export function isCleanCheckin(checkin) {
  const ids = Object.keys(checkin.results || {});
  return ids.length > 0 && ids.every((id) => checkin.results[id]);
}

export function computePlaybookStats(rules, checkins) {
  const sorted = [...checkins].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const ruleStats = rules.map((r) => {
    const tracked = sorted.filter((c) => r.id in (c.results || {}));
    const followed = tracked.filter((c) => c.results[r.id]).length;
    return {
      id: r.id,
      text: r.text,
      trackedCount: tracked.length,
      followedCount: followed,
      pct: tracked.length ? Math.round((followed / tracked.length) * 100) : null,
    };
  });

  let best = 0;
  let run = 0;
  sorted.forEach((c) => {
    if (isCleanCheckin(c)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  });

  let current = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (!isCleanCheckin(sorted[i])) break;
    current += 1;
  }

  const cleanDays = sorted.filter(isCleanCheckin).length;
  const overallPct = sorted.length ? Math.round((cleanDays / sorted.length) * 100) : null;

  return { ruleStats, current, best, hasData: sorted.length > 0, overallPct, totalCheckins: sorted.length };
}
