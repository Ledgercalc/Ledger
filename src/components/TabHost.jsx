import { forwardRef, memo, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";

// TabHost — owns tab switching and the tab-switch animation (replaces the old `<main key={activeTab}>` swap).
//
// Why switching was slow before: every switch threw the whole screen away (`key={activeTab}`), rebuilt it from
// scratch, then ran a CSS stagger animation over every child. That is a full mount + layout + paint of a huge
// tab on the main thread, right in the middle of the dock animation.
//
// What this does instead:
//  * KEEP-ALIVE: tabs you have opened stay mounted (max MAX_KEPT, least recently used are dropped). Switching
//    back is just flipping which pane is visible: no remount, no re-layout of the page, scroll position kept.
//  * FROZEN panes: hidden panes are handed the exact same element object they had, so React skips them
//    completely. Only the visible pane ever renders.
//  * INSTANT SHOW: on tap, the target pane is shown immediately through a tiny local state update
//    (`ref.preview(id)`), before App does its own (bigger) update for the new tab.
//  * COMPOSITOR ANIMATION: the enter animation is a single Web Animation (opacity + translate3d) on the pane,
//    so it keeps running smoothly even when the main thread is busy. No per-child stagger.
//
// Props
//   activeId   id of the tab App is showing        element  JSX for the active tab (already wrapped)
//   layout     { fullBleed, fixed, isDesktop, navSpace }  how the scroller for the active tab is laid out
//   order      tab ids in dock order (decides slide direction)
//   onScroll   scroll handler for the active pane   keepAlive  false => behave like a plain single pane (tour)
// Ref API: ref.current.preview(id)

const MAX_KEPT = 4;

const paneClass = (l) =>
  l.fullBleed ? (l.isDesktop ? "" : "px-0") : l.isDesktop ? "px-8 pt-0 pb-6" : "px-5 pt-0 pb-5";

const PaneBase = forwardRef(function Pane({ active, layout, onScroll, children }, ref) {
  const l = layout;
  return (
    <main
      ref={ref}
      className={paneClass(l)}
      onScroll={active ? onScroll : undefined}
      aria-hidden={active ? undefined : true}
      style={{
        display: active ? (l.fullBleed || l.fixed ? "flex" : "block") : "none",
        flex: "1 1 auto",
        minHeight: 0,
        flexDirection: "column",
        overflowY: l.fullBleed || l.fixed ? "hidden" : "auto",
        overflowX: l.fullBleed ? undefined : "hidden",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        paddingLeft: l.fullBleed && l.isDesktop ? "12px" : undefined,
        paddingRight: l.fullBleed && l.isDesktop ? "12px" : undefined,
        paddingTop: l.fullBleed ? (l.isDesktop ? "2px" : 0) : undefined,
        paddingBottom: l.fullBleed ? (l.isDesktop ? "6px" : l.navSpace) : !l.isDesktop ? l.navSpace : undefined,
      }}
    >
      {children}
    </main>
  );
});
// A hidden pane that gets the same props again is skipped entirely.
const Pane = memo(PaneBase, (p, n) => !p.active && !n.active && p.children === n.children && p.layout === n.layout);

const DEFAULT_LAYOUT = { fullBleed: false, fixed: false, isDesktop: false, navSpace: "calc(84px + env(safe-area-inset-bottom, 0px))" };

const TabHost = forwardRef(function TabHost({ activeId, element, layout, order = [], onScroll, keepAlive = true }, ref) {
  const cacheRef = useRef(new Map()); // id -> { element, layout }
  const usedRef = useRef([]);         // ids, least recently used first
  const paneEls = useRef(new Map());  // id -> <main>
  const scrollPos = useRef(new Map());
  const [previewId, setPreviewId] = useState(null);
  useImperativeHandle(ref, () => ({ preview: (id) => { if (id !== activeId) setPreviewId(id); } }), [activeId]);

  // Remember what the active tab rendered (this is what a hidden pane keeps showing).
  if (!keepAlive) {
    cacheRef.current = new Map();
    usedRef.current = [];
  }
  cacheRef.current.set(activeId, { element, layout });
  usedRef.current = [...usedRef.current.filter((x) => x !== activeId), activeId];
  while (usedRef.current.length > MAX_KEPT) {
    const drop = usedRef.current.find((x) => x !== activeId && x !== previewId);
    if (!drop) break;
    usedRef.current = usedRef.current.filter((x) => x !== drop);
    cacheRef.current.delete(drop);
    paneEls.current.delete(drop);
    scrollPos.current.delete(drop);
  }

  // App caught up with the preview: stop previewing.
  useEffect(() => { setPreviewId(null); }, [activeId]);

  const shownId = keepAlive && previewId ? previewId : activeId;
  const prevShown = useRef(shownId);
  useLayoutEffect(() => {
    const el = paneEls.current.get(shownId);
    if (!el) return;
    if (prevShown.current === shownId) return;
    // restore scroll (display:none resets it), then play the enter animation on the compositor
    const y = scrollPos.current.get(shownId);
    if (y) el.scrollTop = y;
    const from = order.indexOf(prevShown.current);
    const to = order.indexOf(shownId);
    const dir = from !== -1 && to !== -1 && to < from ? -1 : 1;
    prevShown.current = shownId;
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof el.animate === "function") {
      try {
        el.animate(
          reduce
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 0, transform: `translate3d(${22 * dir}px,0,0)` }, { opacity: 1, transform: "translate3d(0,0,0)" }],
          { duration: reduce ? 160 : 260, easing: "cubic-bezier(.22,1,.36,1)" }
        );
      } catch (e) { /* ignore */ }
    }
  }, [shownId]);

  const ids = Array.from(cacheRef.current.keys());
  if (keepAlive && previewId && !cacheRef.current.has(previewId)) ids.push(previewId);

  return (
    <>
      {ids.map((id) => {
        const entry = cacheRef.current.get(id);
        const isActive = id === shownId;
        return (
          <Pane
            key={id}
            ref={(el) => { if (el) paneEls.current.set(id, el); }}
            active={isActive}
            layout={entry ? entry.layout : DEFAULT_LAYOUT}
            onScroll={(e) => { scrollPos.current.set(id, e.currentTarget.scrollTop); if (onScroll) onScroll(e); }}
          >
            {entry ? entry.element : <div className="tz-tab-loading" aria-hidden="true" />}
          </Pane>
        );
      })}
    </>
  );
});

export default TabHost;
