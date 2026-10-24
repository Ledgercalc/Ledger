// Drawing-tool icons in the style TradingView uses: thin outlined glyphs with hollow circles at the anchor points,
// so each tool is recognisable at a glance (drawn from scratch for Tredzi). Colour follows the surrounding text colour.

const trim = (x1, y1, x2, y2, r1, r2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  return [x1 + (dx / len) * r1, y1 + (dy / len) * r1, x2 - (dx / len) * r2, y2 - (dy / len) * r2];
};
const R = 2.4;
const Dot = ({ x, y }) => <circle cx={x} cy={y} r={R} />;
// a line between two points, stopped at the edge of a dot when that end has one
const Ln = ({ a, b, dotA = false, dotB = false }) => {
  const [x1, y1, x2, y2] = trim(a[0], a[1], b[0], b[1], dotA ? R : 0, dotB ? R : 0);
  return <line x1={x1} y1={y1} x2={x2} y2={y2} />;
};
const Chevron = ({ x, y, ang }) => {
  const len = 5;
  const p = (da) => [x - len * Math.cos(ang + da), y - len * Math.sin(ang + da)];
  const a = p(0.5);
  const b = p(-0.5);
  return <path d={`M${a[0]} ${a[1]} L${x} ${y} L${b[0]} ${b[1]}`} />;
};
const Head = ({ x, y, ang }) => {
  const len = 6;
  const p = (da) => [x - len * Math.cos(ang + da), y - len * Math.sin(ang + da)];
  const a = p(0.45);
  const b = p(-0.45);
  return <polygon points={`${x},${y} ${a[0]},${a[1]} ${b[0]},${b[1]}`} fill="currentColor" />;
};
const UP_RIGHT = -Math.PI / 4;

const ART = {
  trend: () => (
    <>
      <Ln a={[6, 22]} b={[22, 6]} dotA dotB />
      <Dot x={6} y={22} />
      <Dot x={22} y={6} />
    </>
  ),
  infoline: () => (
    <>
      <Ln a={[5, 22]} b={[18, 9]} dotA dotB />
      <Dot x={5} y={22} />
      <Dot x={18} y={9} />
      <rect x="17" y="15" width="9" height="7" rx="1.2" />
      <line x1="19" y1="18.5" x2="24" y2="18.5" />
    </>
  ),
  ray: () => (
    <>
      <Ln a={[6, 22]} b={[24, 4]} dotA />
      <Dot x={6} y={22} />
      <Chevron x={24} y={4} ang={UP_RIGHT} />
    </>
  ),
  xline: () => (
    <>
      <Ln a={[4, 24]} b={[10, 18]} dotB />
      <Ln a={[10, 18]} b={[18, 10]} dotA dotB />
      <Ln a={[18, 10]} b={[24, 4]} dotA />
      <Dot x={10} y={18} />
      <Dot x={18} y={10} />
      <Chevron x={24} y={4} ang={UP_RIGHT} />
      <Chevron x={4} y={24} ang={UP_RIGHT + Math.PI} />
    </>
  ),
  arrow: () => (
    <>
      <Ln a={[5, 23]} b={[21, 7]} />
      <Head x={23} y={5} ang={UP_RIGHT} />
    </>
  ),
  hline: () => (
    <>
      <Ln a={[3, 14]} b={[14, 14]} dotB />
      <Ln a={[14, 14]} b={[25, 14]} dotA />
      <Dot x={14} y={14} />
    </>
  ),
  hray: () => (
    <>
      <Ln a={[6, 14]} b={[25, 14]} dotA />
      <Dot x={6} y={14} />
      <Chevron x={25} y={14} ang={0} />
    </>
  ),
  vline: () => (
    <>
      <Ln a={[14, 3]} b={[14, 14]} dotB />
      <Ln a={[14, 14]} b={[14, 25]} dotA />
      <Dot x={14} y={14} />
    </>
  ),
  cross: () => (
    <>
      <Ln a={[3, 14]} b={[14, 14]} dotB />
      <Ln a={[14, 14]} b={[25, 14]} dotA />
      <Ln a={[14, 3]} b={[14, 14]} dotB />
      <Ln a={[14, 14]} b={[14, 25]} dotA />
      <Dot x={14} y={14} />
    </>
  ),
  channel: () => (
    <>
      <Ln a={[4, 17]} b={[17, 4]} dotA dotB />
      <Dot x={4} y={17} />
      <Dot x={17} y={4} />
      <Ln a={[11, 24]} b={[24, 11]} dotA />
      <Dot x={11} y={24} />
    </>
  ),
  pitchfork: () => (
    <>
      <Ln a={[5, 21]} b={[24, 11.5]} dotA />
      <Dot x={5} y={21} />
      <Ln a={[8, 10]} b={[24, 2]} dotA />
      <Dot x={8} y={10} />
      <Ln a={[12, 25]} b={[25, 18.5]} dotA />
      <Dot x={12} y={25} />
      <line x1="8" y1="12.4" x2="12" y2="22.6" strokeDasharray="2 2" />
    </>
  ),
  fib: () => (
    <>
      <line x1="9" y1="6" x2="25" y2="6" />
      <line x1="11" y1="11" x2="25" y2="11" />
      <line x1="11" y1="17" x2="25" y2="17" />
      <line x1="9" y1="22" x2="25" y2="22" />
      <Ln a={[5, 22]} b={[5, 6]} />
      <Dot x={5} y={22} />
      <Dot x={5} y={6} />
    </>
  ),
  fibext: () => (
    <>
      <Ln a={[5, 22]} b={[11, 7]} dotA dotB />
      <Ln a={[11, 7]} b={[16, 17]} dotA dotB />
      <Dot x={5} y={22} />
      <Dot x={11} y={7} />
      <Dot x={16} y={17} />
      <line x1="18.5" y1="17" x2="25" y2="17" />
      <line x1="18.5" y1="11" x2="25" y2="11" />
      <line x1="18.5" y1="5" x2="25" y2="5" />
    </>
  ),
  measure: () => (
    <>
      <rect x="5" y="8" width="18" height="13" strokeDasharray="2.5 2" />
      <Ln a={[6, 20]} b={[20.5, 9.5]} />
      <Head x={22.5} y={8} ang={-0.62} />
    </>
  ),
  prange: () => (
    <>
      <line x1="5" y1="6" x2="23" y2="6" />
      <line x1="5" y1="22" x2="23" y2="22" />
      <line x1="14" y1="7.5" x2="14" y2="20.5" />
      <Head x={14} y={6} ang={-Math.PI / 2} />
      <Head x={14} y={22} ang={Math.PI / 2} />
    </>
  ),
  drange: () => (
    <>
      <line x1="6" y1="5" x2="6" y2="23" />
      <line x1="22" y1="5" x2="22" y2="23" />
      <line x1="7.5" y1="14" x2="20.5" y2="14" />
      <Head x={6} y={14} ang={Math.PI} />
      <Head x={22} y={14} ang={0} />
    </>
  ),
  rect: () => (
    <>
      <rect x="5" y="8" width="18" height="12" />
      <circle cx="5" cy="8" r={R} fill="currentColor" fillOpacity="0.15" />
      <circle cx="23" cy="20" r={R} fill="currentColor" fillOpacity="0.15" />
    </>
  ),
  ellipse: () => (
    <>
      <ellipse cx="14" cy="14" rx="9" ry="6" />
      <circle cx="5" cy="14" r={R} fill="currentColor" fillOpacity="0.15" />
      <circle cx="23" cy="14" r={R} fill="currentColor" fillOpacity="0.15" />
    </>
  ),
  triangle: () => (
    <>
      <polygon points="14,5 23,22 5,22" />
      <circle cx="14" cy="5" r={R} fill="currentColor" fillOpacity="0.15" />
      <circle cx="23" cy="22" r={R} fill="currentColor" fillOpacity="0.15" />
      <circle cx="5" cy="22" r={R} fill="currentColor" fillOpacity="0.15" />
    </>
  ),
  brush: () => <path d="M5 20 C7 8, 11 7, 13 13 S18 22, 23 8" strokeWidth="1.8" />,
  text: () => (
    <>
      <line x1="7" y1="7" x2="21" y2="7" strokeWidth="1.8" />
      <line x1="14" y1="7" x2="14" y2="22" strokeWidth="1.8" />
      <line x1="11" y1="22" x2="17" y2="22" strokeWidth="1.8" />
    </>
  ),
  long: () => (
    <>
      <rect x="4" y="5" width="20" height="9" fill="#089981" fillOpacity="0.35" stroke="#089981" />
      <rect x="4" y="14" width="20" height="9" fill="#f23645" fillOpacity="0.35" stroke="#f23645" />
      <line x1="4" y1="14" x2="24" y2="14" />
    </>
  ),
  short: () => (
    <>
      <rect x="4" y="5" width="20" height="9" fill="#f23645" fillOpacity="0.35" stroke="#f23645" />
      <rect x="4" y="14" width="20" height="9" fill="#089981" fillOpacity="0.35" stroke="#089981" />
      <line x1="4" y1="14" x2="24" y2="14" />
    </>
  ),
};

export function DrawIcon({ id, size = 20 }) {
  const art = ART[id];
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {art ? art() : null}
    </svg>
  );
}

export const iconFor = (id) => {
  const Comp = (props) => <DrawIcon id={id} {...props} />;
  Comp.displayName = `DrawIcon(${id})`;
  return Comp;
};
