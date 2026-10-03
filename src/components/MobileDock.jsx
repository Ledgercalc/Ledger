import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from "react";
import { palette } from "../lib/theme.js";

// Mobile bottom navigation dock — its own file so tab taps never wait for the big App render.
//
// Why it is smooth:
//  * The tapped tab highlights from the dock's OWN state first (a tiny render); the heavy tab content
//    is switched afterwards through App's low-priority transition.
//  * The dock is memoised: App re-renders (typing, polling, timers...) don't re-render it.
//  * Hide-on-scroll is done on the DOM node directly (no React state), so scrolling never re-renders App.
//  * Only compositor-friendly properties animate (transform / opacity). No backdrop-filter blur.
//  * The "scroll the active tab into view" move happens once, after the label has finished unfolding.
//
// Props
//   tabs        [{ id, label, icon }]   already in display order
//   activeId    id of the tab currently shown
//   onSelect    (id) => void            switch tab (App wraps it in a transition)
//   onPreload   (id) => void            optional, called on pointer-down to warm the tab chunk
//   forceHidden boolean                 hide the dock (a sheet / settings / menu is open)
//   themeKey    string                  change it when the theme changes so the dock repaints
// Ref API: ref.current.setScrollHidden(bool)

const CSS = `
.tzd{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:60;display:flex;align-items:stretch;border-radius:999px;
  transform:translate3d(0,0,0);opacity:1;transition:transform .32s cubic-bezier(.22,1,.36,1),opacity .2s ease;will-change:transform;contain:layout style;touch-action:manipulation}
.tzd[data-hidden="true"]{transform:translate3d(0,calc(100% + 36px),0);opacity:0;pointer-events:none}
.tzd__scroll{display:flex;flex:1;align-items:center;gap:4px;padding:6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;
  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 12px,#000 calc(100% - 12px),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 12px,#000 calc(100% - 12px),transparent 100%)}
.tzd__scroll::-webkit-scrollbar{display:none}
.tzd__item{position:relative;flex:none;display:flex;align-items:center;justify-content:center;padding:12px 16px;border:0;border-radius:999px;background:transparent;font:inherit;cursor:pointer;
  -webkit-tap-highlight-color:transparent;transition:color .2s ease,transform .16s ease}
.tzd__item:active{transform:scale(.93)}
.tzd__item::before{content:"";position:absolute;inset:0;border-radius:999px;background:var(--tzd-active-bg);opacity:0;transform:scale(.82);transition:opacity .22s ease,transform .3s cubic-bezier(.22,1,.36,1);z-index:-1}
.tzd__item[data-active="true"]::before{opacity:1;transform:scale(1)}
.tzd__item>*{position:relative}
.tzd__icon{display:block;flex:none}
.tzd__item[data-active="true"] .tzd__icon{animation:tzdPop .36s cubic-bezier(.34,1.56,.64,1) both}
@keyframes tzdPop{0%{transform:scale(.72)}60%{transform:scale(1.16)}100%{transform:scale(1)}}
.tzd__label{display:grid;grid-template-columns:0fr;opacity:0;transform:translate3d(-4px,0,0);transition:grid-template-columns .28s cubic-bezier(.22,1,.36,1),opacity .2s ease,transform .28s cubic-bezier(.22,1,.36,1)}
.tzd__item[data-active="true"] .tzd__label{grid-template-columns:1fr;opacity:1;transform:translate3d(0,0,0)}
.tzd__label>span{overflow:hidden;min-width:0}
.tzd__label-text{display:block;white-space:nowrap;padding-left:8px;font-size:12.5px;letter-spacing:.02em;font-weight:600}
@media (prefers-reduced-motion:reduce){.tzd,.tzd__item,.tzd__item::before,.tzd__label{transition:none!important}.tzd__item[data-active="true"] .tzd__icon{animation:none!important}}
`;

let injected = false;
function ensureStyles() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-tz-dock", "");
  el.textContent = CSS;
  document.head.appendChild(el);
}

const MobileDockBase = forwardRef(function MobileDock({ tabs, activeId, onSelect, onPreload, forceHidden = false }, ref) {
  ensureStyles();
  const navRef = useRef(null);
  const scrollRef = useRef(null);
  const scrollHiddenRef = useRef(false);
  const forceRef = useRef(forceHidden);
  const [optimisticId, setOptimisticId] = useState(null);
  const currentId = optimisticId ?? activeId;

  const applyHidden = () => {
    const n = navRef.current;
    if (n) n.setAttribute("data-hidden", scrollHiddenRef.current || forceRef.current ? "true" : "false");
  };
  useImperativeHandle(ref, () => ({
    setScrollHidden(v) {
      if (scrollHiddenRef.current === v) return;
      scrollHiddenRef.current = v;
      applyHidden();
    },
  }));
  useEffect(() => {
    forceRef.current = forceHidden;
    applyHidden();
  }, [forceHidden]);

  // The real tab caught up with the tap (or changed some other way): drop the optimistic highlight,
  // and make sure the dock is visible again for the new screen.
  useEffect(() => {
    setOptimisticId(null);
    scrollHiddenRef.current = false;
    applyHidden();
  }, [activeId]);

  // Bring the active tab into view once its label has finished unfolding (one smooth move, not two).
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return undefined;
    const t = setTimeout(() => {
      const item = root.querySelector('[data-active="true"]');
      if (!item) return;
      const left = Math.max(0, Math.min(root.scrollWidth - root.clientWidth, item.offsetLeft + item.offsetWidth / 2 - root.clientWidth / 2));
      if (Math.abs(root.scrollLeft - left) > 2) root.scrollTo({ left, behavior: "smooth" });
    }, 300);
    return () => clearTimeout(t);
  }, [currentId]);

  const activeBg = `${palette.gold}1E`;
  return (
    <nav
      ref={navRef}
      className="tzd"
      aria-label="Main"
      data-hidden={forceHidden ? "true" : "false"}
      style={{
        "--tzd-active-bg": activeBg,
        border: `1px solid ${palette.border}`,
        background: `${palette.surface}F7`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.32)",
      }}
    >
      <div ref={scrollRef} className="tzd__scroll">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = currentId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-tour-id={`tab-${tab.id}`}
              data-active={active ? "true" : "false"}
              data-dock-active={active ? "true" : undefined}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className="tzd__item"
              style={{ color: active ? palette.goldBright : palette.textMuted }}
              onPointerDown={() => { try { onPreload && onPreload(tab.id); } catch (e) { /* ignore */ } }}
              onClick={() => {
                if (tab.id === currentId) return;
                setOptimisticId(tab.id); // instant, tiny re-render of the dock only
                onSelect(tab.id);        // App switches the content in a low-priority transition
              }}
            >
              <Icon className="tzd__icon" size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span className="tzd__label" aria-hidden="true">
                <span><span className="tzd__label-text">{tab.label}</span></span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

// Re-render only when something the dock actually shows changes.
const sameTabs = (a, b) => a.length === b.length && a.every((t, i) => t.id === b[i].id && t.label === b[i].label && t.icon === b[i].icon);
const MobileDock = memo(MobileDockBase, (p, n) =>
  p.activeId === n.activeId && p.forceHidden === n.forceHidden && p.themeKey === n.themeKey && sameTabs(p.tabs, n.tabs)
);
export default MobileDock;
