import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Clock, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { palette, sans } from "../lib/theme.js";

/* =====================================================================================
   Economic calendar tab - TradeFuse-style layout. Everything on this screen comes from
   your own worker (/market/calendar). No embedded widgets, no outside calendar source.
   ===================================================================================== */

const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const AMBER = "#f5a524";
const hairline = { borderTop: `1px solid ${palette.border}` };

/* ---------- currencies ---------- */
const CCY_META = {
  USD: { name: "United States", bank: "Fed" },
  EUR: { name: "Euro Area", bank: "ECB" },
  GBP: { name: "United Kingdom", bank: "BoE" },
  JPY: { name: "Japan", bank: "BoJ" },
  AUD: { name: "Australia", bank: "RBA" },
  NZD: { name: "New Zealand", bank: "RBNZ" },
  CAD: { name: "Canada", bank: "BoC" },
  CHF: { name: "Switzerland", bank: "SNB" },
  CNY: { name: "China", bank: "PBoC" },
  SEK: { name: "Sweden", bank: "Riksbank" },
  NOK: { name: "Norway", bank: "Norges Bank" },
  PLN: { name: "Poland", bank: "NBP" },
  TRY: { name: "Turkey", bank: "CBRT" },
  ZAR: { name: "South Africa", bank: "SARB" },
  MXN: { name: "Mexico", bank: "Banxico" },
  BRL: { name: "Brazil", bank: "BCB" },
  INR: { name: "India", bank: "RBI" },
  KRW: { name: "South Korea", bank: "BoK" },
  SGD: { name: "Singapore", bank: "MAS" },
  HKD: { name: "Hong Kong", bank: "HKMA" },
};
const CCY_ORDER = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "CNY", "HKD", "SGD", "KRW", "INR", "SEK", "NOK", "PLN", "TRY", "ZAR", "MXN", "BRL"];
const CCY_BY_COUNTRY = {
  US: "USD", "UNITED STATES": "USD", EU: "EUR", EA: "EUR", "EURO AREA": "EUR", EUROZONE: "EUR",
  DE: "EUR", GERMANY: "EUR", FR: "EUR", FRANCE: "EUR", IT: "EUR", ITALY: "EUR", ES: "EUR", SPAIN: "EUR",
  GB: "GBP", UK: "GBP", "UNITED KINGDOM": "GBP", JP: "JPY", JAPAN: "JPY", CH: "CHF", SWITZERLAND: "CHF",
  CA: "CAD", CANADA: "CAD", AU: "AUD", AUSTRALIA: "AUD", NZ: "NZD", "NEW ZEALAND": "NZD", CN: "CNY", CHINA: "CNY",
  SE: "SEK", SWEDEN: "SEK", NO: "NOK", NORWAY: "NOK", PL: "PLN", POLAND: "PLN", TR: "TRY", TURKEY: "TRY", ZA: "ZAR", "SOUTH AFRICA": "ZAR",
  MX: "MXN", MEXICO: "MXN", BR: "BRL", BRAZIL: "BRL", IN: "INR", INDIA: "INR", KR: "KRW", "SOUTH KOREA": "KRW", SG: "SGD", SINGAPORE: "SGD", HK: "HKD", "HONG KONG": "HKD",
};
const ZONES = [
  ["Asia/Dhaka", "Dhaka"], ["Asia/Singapore", "Singapore"], ["Asia/Dubai", "Dubai"], ["Asia/Tokyo", "Tokyo"], ["Australia/Sydney", "Sydney"],
  ["Pacific/Auckland", "Auckland"], ["Europe/London", "London"], ["Europe/Berlin", "Frankfurt"], ["Europe/Zurich", "Zurich"],
  ["America/New_York", "New York"], ["America/Chicago", "Chicago"], ["America/Toronto", "Toronto"], ["UTC", "UTC"],
];

/* ---------- currency icons: round flags (artwork from the MIT-licensed "country-flag-icons" set, stored right here so nothing is loaded from outside) ---------- */
const FLAG_SVG = {
  SEK: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 100\"><path fill=\"#006AA7\" d=\"M0 0h160v100H0z\"/><path fill=\"#FECC00\" d=\"M50 0h20v100H50zM0 40h160v20H0z\"/></svg>",
  NOK: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 100\"><path fill=\"#BA0C2F\" d=\"M0 0h160v100H0z\"/><path fill=\"#FFF\" d=\"M45 0h22v100H45zM0 39h160v22H0z\"/><path fill=\"#00205B\" d=\"M52 0h8v100h-8zM0 46h160v8H0z\"/></svg>",
  PLN: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 100\"><path fill=\"#FFF\" d=\"M0 0h160v50H0z\"/><path fill=\"#DC143C\" d=\"M0 50h160v50H0z\"/></svg>",
  MXN: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 100\"><path fill=\"#006847\" d=\"M0 0h54v100H0z\"/><path fill=\"#FFF\" d=\"M53 0h54v100H53z\"/><path fill=\"#CE1126\" d=\"M106 0h54v100h-54z\"/><circle cx=\"80\" cy=\"50\" r=\"12\" fill=\"#8C6B3F\"/></svg>",
  INR: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 100\"><path fill=\"#FF9933\" d=\"M0 0h160v34H0z\"/><path fill=\"#FFF\" d=\"M0 33h160v34H0z\"/><path fill=\"#138808\" d=\"M0 66h160v34H0z\"/><circle cx=\"80\" cy=\"50\" r=\"11\" fill=\"none\" stroke=\"#000080\" stroke-width=\"3\"/></svg>",
  SGD: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 100\"><path fill=\"#EF3340\" d=\"M0 0h160v50H0z\"/><path fill=\"#FFF\" d=\"M0 50h160v50H0z\"/><circle cx=\"34\" cy=\"25\" r=\"14\" fill=\"#FFF\"/><circle cx=\"40\" cy=\"25\" r=\"13\" fill=\"#EF3340\"/></svg>",
  USD: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"59.85 0 342 342\"><path fill=\"#FFF\" d=\"M0 0h513v342H0z\"/><g fill=\"#D80027\"><path d=\"M0 0h513v26.3H0zM0 52.6h513v26.3H0zM0 105.2h513v26.3H0zM0 157.8h513v26.3H0zM0 210.5h513v26.3H0zM0 263.1h513v26.3H0zM0 315.7h513V342H0z\"/></g><path fill=\"#2E52B2\" d=\"M0 0h256.5v184.1H0z\"/><g fill=\"#FFF\"><path d=\"m47.8 138.9-4-12.8-4.4 12.8H26.2l10.7 7.7-4 12.8 10.9-7.9 10.6 7.9-4.1-12.8 10.9-7.7zM104.1 138.9l-4.1-12.8-4.2 12.8H82.6l10.7 7.7-4 12.8 10.7-7.9 10.8 7.9-4-12.8 10.7-7.7zM160.6 138.9l-4.3-12.8-4 12.8h-13.5l11 7.7-4.2 12.8 10.7-7.9 11 7.9-4.2-12.8 10.7-7.7zM216.8 138.9l-4-12.8-4.2 12.8h-13.3l10.8 7.7-4 12.8 10.7-7.9 10.8 7.9-4.3-12.8 11-7.7zM100 75.3l-4.2 12.8H82.6L93.3 96l-4 12.6 10.7-7.8 10.8 7.8-4-12.6 10.7-7.9h-13.4zM43.8 75.3l-4.4 12.8H26.2L36.9 96l-4 12.6 10.9-7.8 10.6 7.8L50.3 96l10.9-7.9H47.8zM156.3 75.3l-4 12.8h-13.5l11 7.9-4.2 12.6 10.7-7.8 11 7.8-4.2-12.6 10.7-7.9h-13.2zM212.8 75.3l-4.2 12.8h-13.3l10.8 7.9-4 12.6 10.7-7.8 10.8 7.8-4.3-12.6 11-7.9h-13.5zM43.8 24.7l-4.4 12.6H26.2l10.7 7.9-4 12.7L43.8 50l10.6 7.9-4.1-12.7 10.9-7.9H47.8zM100 24.7l-4.2 12.6H82.6l10.7 7.9-4 12.7L100 50l10.8 7.9-4-12.7 10.7-7.9h-13.4zM156.3 24.7l-4 12.6h-13.5l11 7.9-4.2 12.7 10.7-7.9 11 7.9-4.2-12.7 10.7-7.9h-13.2zM212.8 24.7l-4.2 12.6h-13.3l10.8 7.9-4 12.7 10.7-7.9 10.8 7.9-4.3-12.7 11-7.9h-13.5z\"/></g></svg>",
  EUR: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 408 408\"><path fill=\"#039\" d=\"M0 0h408v408H0V0z\"/><path fill=\"#FC0\" d=\"m203.963 45.231 5.089 15.653h16.542l-13.322 9.68 5.015 15.67-13.323-9.68-13.323 9.68 5.089-15.662-13.322-9.68h16.468l5.087-15.661zm-68 18.134 5.089 15.653h16.542l-13.323 9.68 5.016 15.67-13.324-9.68-13.323 9.68 5.089-15.662-13.323-9.681h16.468l5.089-15.66zm-49.867 49.866 5.089 15.653h16.542l-13.323 9.68 5.016 15.67-13.324-9.68-13.323 9.68 5.089-15.662-13.323-9.68h16.468l5.089-15.661zM67.963 181.23l5.089 15.654h16.542l-13.323 9.682 5.016 15.67-13.324-9.682-13.323 9.682 5.089-15.664-13.323-9.679h16.468l5.089-15.663zm18.133 68.001 5.089 15.654h16.542l-13.323 9.68 5.016 15.67-13.324-9.68-13.323 9.68 5.089-15.662-13.323-9.68h16.468l5.089-15.662zm49.867 49.867 5.089 15.654h16.542l-13.323 9.68 5.016 15.67-13.324-9.679-13.323 9.679 5.089-15.661-13.323-9.681h16.468l5.089-15.662zm136-235.733 5.089 15.653h16.542l-13.322 9.68 5.015 15.67-13.323-9.68-13.324 9.68 5.09-15.662-13.322-9.681h16.468l5.087-15.66zm49.867 49.866 5.088 15.653h16.543l-13.323 9.68 5.015 15.67-13.322-9.68-13.324 9.68 5.09-15.662-13.323-9.68h16.468l5.088-15.661zm18.133 68 5.089 15.653h16.542l-13.322 9.682 5.015 15.67-13.323-9.682-13.323 9.682 5.089-15.664-13.322-9.679h16.468l5.087-15.662zm-18.133 68 5.088 15.654h16.543l-13.323 9.68 5.016 15.67-13.323-9.68-13.324 9.68 5.09-15.662-13.323-9.68h16.469l5.087-15.662zm-117.867 68 5.089 15.654h16.542l-13.322 9.68 5.015 15.67-13.323-9.68-13.323 9.68 5.089-15.662-13.322-9.68h16.468l5.087-15.662zm68-18.133 5.089 15.654h16.542l-13.322 9.68 5.016 15.67-13.324-9.68-13.322 9.68 5.088-15.662-13.322-9.68h16.469l5.086-15.662z\"/></svg>",
  GBP: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"85.5 0 342 342\"><g fill=\"#FFF\"><path d=\"M0 0h513v341.3H0V0z\"/><path d=\"M311.7 230 513 341.3v-31.5L369.3 230h-57.6zM200.3 111.3 0 0v31.5l143.7 79.8h56.6z\"/></g><g fill=\"#012169\"><path d=\"M393.8 230 513 295.7V230H393.8zm-82.1 0L513 341.3v-31.5L369.3 230h-57.6zm146.9 111.3-147-81.7v81.7h147zM90.3 230 0 280.2V230h90.3zm110 14.2v97.2H25.5l174.8-97.2zM118.2 111.3 0 45.6v65.7h118.2zm82.1 0L0 0v31.5l143.7 79.8h56.6zM53.4 0l147 81.7V0h-147zM421.7 111.3 513 61.1v50.2h-91.3zm-110-14.2V0h174.9L311.7 97.1z\"/></g><g fill=\"#c8102e\"><path d=\"M288 0h-64v138.7H0v64h224v138.7h64V202.7h224v-64H288V0z\"/><path d=\"M311.7 230 513 341.3v-31.5L369.3 230h-57.6zM143.7 230 0 309.9v31.5L200.3 230h-56.6zM200.3 111.3 0 0v31.5l143.7 79.8h56.6zM368.3 111.3 513 31.5V0L311.7 111.3h56.6z\"/></g></svg>",
  JPY: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"85.5 0 342 342\"><path fill=\"#FFF\" d=\"M0 0h512v342H0z\"/><circle fill=\"#D80027\" cx=\"256.5\" cy=\"171\" r=\"96\"/></svg>",
  AUD: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"85.5 0 342 342\"><path fill=\"#00008b\" d=\"M0 0h513v342H0z\"/><g fill=\"#FFF\"><path d=\"m188 212.6 11 22.9 24.7-5.7-11 22.8 19.9 15.8-24.8 5.6.1 25.4-19.9-15.9-19.8 15.9.1-25.4-24.8-5.6 19.9-15.8-11.1-22.8 24.8 5.7zM385.9 241.1l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.6v12.2l-9.4-7.6-9.5 7.6.1-12.2-11.8-2.6 9.5-7.5-5.3-10.9 11.8 2.7zM337.3 125.1l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.7v12.1l-9.4-7.6-9.5 7.6.1-12.1-11.9-2.7 9.5-7.5-5.3-10.9L332 136zM385.9 58.9l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.7v12.1l-9.4-7.6-9.5 7.6.1-12.1-11.8-2.7 9.5-7.5-5.3-10.9 11.8 2.7zM428.4 108.6l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.6V150l-9.4-7.6-9.5 7.6v-12.2l-11.8-2.6 9.5-7.5-5.3-10.9 11.8 2.7zM398 166.5l4.1 12.7h13.3l-10.8 7.8 4.2 12.7-10.8-7.9-10.8 7.9 4.1-12.7-10.7-7.8h13.3z\"/></g><path fill=\"#00008b\" d=\"M0 0h256.5v171H0z\"/><g fill=\"#FFF\"><path d=\"M256.5 0v30.6l-45.3 25.2h45.3v59.4h-59.2l59.2 32.9V171h-26.7l-73.7-40.9V171h-55.7v-48.7L12.8 171H0v-30.6l45.3-25.2H0V55.8h59.2L0 22.9V0h26.7l73.7 40.9V0h55.7v48.7L243.7 0z\"/><path d=\"M156.1 115.2 256.5 171v-15.8l-72-40zM100.4 55.8 0 0v15.8l72 40z\"/></g><g fill=\"red\"><path d=\"M144.3 0h-32.1v69.5H0v32h112.2V171h32.1v-69.5h112.2v-32H144.3z\"/><path d=\"M156.1 115.2 256.5 171v-15.8l-72-40zM72 115.2l-72 40V171l100.4-55.8zM100.4 55.8 0 0v15.8l72 40zM184.5 55.8l72-40V0L156.1 55.8z\"/></g></svg>",
  NZD: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"114.57 0 342 342\"><path fill=\"#012169\" d=\"M0 0h513v342H0z\"/><g fill=\"#D80027\" stroke=\"#FFF\" stroke-width=\"2\" stroke-miterlimit=\"10\"><path d=\"m448.9 107.7 4.2 13.1h13.8l-11.1 8.1L460 142l-11.1-8.1-11.1 8.1 4.2-13.1-11.1-8.1h13.7zM384.7 253.6l5.1 15.6h16.4l-13.2 9.7 5 15.6-13.3-9.7-13.2 9.7 5-15.6-13.3-9.7h16.5zM384.8 43.4l4.7 14.6h15.3l-12.4 8.9 4.7 14.6-12.3-9-12.4 9 4.7-14.6-12.3-8.9H380zM320.6 129.4l4.7 14.5h15.3l-12.3 9 4.7 14.5-12.4-8.9-12.3 8.9 4.7-14.5-12.4-9h15.3z\"/></g><path fill=\"#012169\" d=\"M0 0h256.5v171H0z\"/><g fill=\"#FFF\"><path d=\"M256.5 0v30.6l-45.3 25.2h45.3v59.4h-59.2l59.2 32.9V171h-26.7l-73.7-40.9V171h-55.7v-48.7L12.8 171H0v-30.6l45.3-25.2H0V55.8h59.2L0 22.9V0h26.7l73.7 40.9V0h55.7v48.7L243.7 0z\"/><path d=\"M156.1 115.2 256.5 171v-15.8l-72-40zM100.4 55.8 0 0v15.8l72 40z\"/></g><g fill=\"#D80027\"><path d=\"M144.3 0h-32.1v69.5H0v32h112.2V171h32.1v-69.5h112.2v-32H144.3z\"/><path d=\"M156.1 115.2 256.5 171v-15.8l-72-40zM72 115.2l-72 40V171l100.4-55.8zM100.4 55.8 0 0v15.8l72 40zM184.5 55.8l72-40V0L156.1 55.8z\"/></g></svg>",
  CAD: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"85.5 0 342 342\"><path fill=\"#FFF\" d=\"M0 0h513v342H0z\"/><g fill=\"red\"><path d=\"M0 0h142v342H0zM371 0h142v342H371zM306.5 206l50.4-25.2-25.2-12.6V143l-50.4 25.2 25.2-50.4h-25.2L256.1 80l-25.2 37.8h-25.2l25.2 50.4-50.4-25.2v25.2l-25.2 12.6 50.4 25.2-12.6 25.2h50.4V269h25.2v-37.8h50.4z\"/></g></svg>",
  CHF: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"128 0 512 512\"><path fill=\"red\" d=\"M0 0h768v512H0V0z\"/><path fill=\"#FFF\" d=\"M336 96h96v112h112v96H432v112h-96V304H224v-96h112V96z\"/></svg>",
  CNY: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"75.24 0 342 342\"><path fill=\"#D80027\" d=\"M0 0h513v342H0z\"/><g fill=\"#FFDA44\"><path d=\"m226.8 239.2-9.7-15.6-17.9 4.4 11.9-14.1-9.7-15.6 17.1 6.9 11.8-14.1-1.3 18.4 17.1 6.9-17.9 4.4zM290.6 82l-10.1 15.4 11.6 14.3-17.7-4.8-10.1 15.5-1-18.4-17.7-4.8 17.2-6.6-1-18.4 11.6 14.3zM236.2 25.4l-2 18.3 16.8 7.6-18 3.8-2 18.3-9.2-16-17.9 3.8 12.3-13.7-9.2-15.9 16.8 7.5zM292.8 161.8l-14.9 10.9 5.8 17.5-14.9-10.8-14.9 11 5.6-17.6-14.9-10.7 18.4-.1 5.6-17.6 5.8 17.5zM115 46.3l17.3 53.5h56.2l-45.4 32.9 17.3 53.5-45.4-33-45.5 33 17.4-53.5-45.5-32.9h56.3z\"/></g></svg>",
  TRY: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 100\"><path fill=\"#E30A17\" d=\"M0 0h160v100H0z\"/><circle cx=\"62\" cy=\"50\" r=\"26\" fill=\"#fff\"/><circle cx=\"70\" cy=\"50\" r=\"21\" fill=\"#E30A17\"/><polygon fill=\"#fff\" points=\"109.0,50.0 100.0,52.9 100.0,62.4 94.5,54.7 85.5,57.6 91.0,50.0 85.5,42.4 94.5,45.3 100.0,37.6 100.0,47.1\"/></svg>",
  HKD: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 100\"><path fill=\"#DE2910\" d=\"M0 0h160v100H0z\"/><ellipse cx=\"80\" cy=\"30\" rx=\"8\" ry=\"17\" fill=\"#fff\" transform=\"rotate(0 80 50)\"/><ellipse cx=\"80\" cy=\"30\" rx=\"8\" ry=\"17\" fill=\"#fff\" transform=\"rotate(72 80 50)\"/><ellipse cx=\"80\" cy=\"30\" rx=\"8\" ry=\"17\" fill=\"#fff\" transform=\"rotate(144 80 50)\"/><ellipse cx=\"80\" cy=\"30\" rx=\"8\" ry=\"17\" fill=\"#fff\" transform=\"rotate(216 80 50)\"/><ellipse cx=\"80\" cy=\"30\" rx=\"8\" ry=\"17\" fill=\"#fff\" transform=\"rotate(288 80 50)\"/><circle cx=\"80\" cy=\"50\" r=\"4\" fill=\"#DE2910\"/></svg>",
  KRW: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 100\"><path fill=\"#fff\" d=\"M0 0h160v100H0z\"/><circle cx=\"80\" cy=\"50\" r=\"22\" fill=\"#0047A0\"/><path d=\"M58 50a22 22 0 0 1 44 0a11 11 0 0 1-22 0a11 11 0 0 0-22 0z\" fill=\"#CD2E3A\"/><g transform=\"rotate(-35 80 50) translate(80 50)\" fill=\"#000\"><rect x=\"-9\" y=\"-40\" width=\"18\" height=\"3\"/><rect x=\"-9\" y=\"-35\" width=\"18\" height=\"3\"/><rect x=\"-9\" y=\"-30\" width=\"18\" height=\"3\"/></g><g transform=\"rotate(35 80 50) translate(80 50)\" fill=\"#000\"><rect x=\"-9\" y=\"-40\" width=\"18\" height=\"3\"/><rect x=\"-9\" y=\"-35\" width=\"18\" height=\"3\"/><rect x=\"-9\" y=\"-30\" width=\"18\" height=\"3\"/></g><g transform=\"rotate(145 80 50) translate(80 50)\" fill=\"#000\"><rect x=\"-9\" y=\"-40\" width=\"18\" height=\"3\"/><rect x=\"-9\" y=\"-35\" width=\"18\" height=\"3\"/><rect x=\"-9\" y=\"-30\" width=\"18\" height=\"3\"/></g><g transform=\"rotate(215 80 50) translate(80 50)\" fill=\"#000\"><rect x=\"-9\" y=\"-40\" width=\"18\" height=\"3\"/><rect x=\"-9\" y=\"-35\" width=\"18\" height=\"3\"/><rect x=\"-9\" y=\"-30\" width=\"18\" height=\"3\"/></g></svg>",
  ZAR: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 100\"><path fill=\"#DE3831\" d=\"M0 0h160v50H0z\"/><path fill=\"#002395\" d=\"M0 50h160v50H0z\"/><path d=\"M0 0L55 50L0 100M55 50H160\" fill=\"none\" stroke=\"#fff\" stroke-width=\"30\"/><path d=\"M0 0L55 50L0 100M55 50H160\" fill=\"none\" stroke=\"#007A4D\" stroke-width=\"16\"/><path fill=\"#FFB612\" d=\"M0 8L48 50L0 92z\"/><path fill=\"#000\" d=\"M0 22L34 50L0 78z\"/></svg>",
  BRL: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 100\"><path fill=\"#009C3B\" d=\"M0 0h160v100H0z\"/><path fill=\"#FFDF00\" d=\"M80 9L150 50L80 91L10 50z\"/><circle cx=\"80\" cy=\"50\" r=\"24\" fill=\"#002776\"/><path d=\"M57 55Q80 44 103 55\" fill=\"none\" stroke=\"#fff\" stroke-width=\"4\"/></svg>",
};
const FLAG_URI = {};
const flagUri = (ccy) => {
  if (!FLAG_SVG[ccy]) return "";
  return FLAG_URI[ccy] || (FLAG_URI[ccy] = `data:image/svg+xml;utf8,${encodeURIComponent(FLAG_SVG[ccy])}`);
};
function Flag({ ccy, w = 22 }) {
  const src = flagUri(ccy);
  const ring = { width: w, height: w, borderRadius: "50%", flexShrink: 0, boxShadow: `0 0 0 1px ${tint(palette.text, 18)}` };
  if (!src) {
    return (
      <span aria-hidden="true" style={{ ...ring, display: "inline-grid", placeItems: "center", background: tint(palette.text, 10), color: palette.textMuted, fontSize: w * 0.36, fontWeight: 800 }}>
        {(ccy || "?").slice(0, 2)}
      </span>
    );
  }
  return <img src={src} alt="" aria-hidden="true" width={w} height={w} draggable={false} style={{ ...ring, display: "block", objectFit: "cover" }} />;
}
// Two overlapping flags for a currency pair such as EUR/USD.
function PairIcon({ a, b, w = 22 }) {
  const overlap = Math.round(w * 0.38);
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
      <Flag ccy={a} w={w} />
      <span style={{ marginLeft: -overlap, borderRadius: "50%", boxShadow: `0 0 0 2px ${palette.surface}`, display: "inline-flex" }}>
        <Flag ccy={b} w={w} />
      </span>
    </span>
  );
}
// "EUR/USD", "EURUSD", "EUR-USD" -> ["EUR", "USD"] (only when both sides are real currency codes)
function parsePair(text) {
  const m = String(text || "").toUpperCase().match(/^([A-Z]{3})[\/\-_ ]?([A-Z]{3})$/);
  return m && m[1] !== m[2] && (CCY_META[m[1]] || m[1] === "XAU") && (CCY_META[m[2]] || m[2] === "XAU") ? [m[1], m[2]] : null;
}

/* ---------- preferences ---------- */
function loadPref(key, fallback) {
  try {
    const v = JSON.parse(window.localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}
function savePref(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // storage unavailable; the choice just won't be remembered
  }
}

/* ---------- event data helpers ---------- */
function toMs(v) {
  if (v == null || v === "") return NaN;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return n < 1e12 ? n * 1000 : n;
  }
  if (/^\d{4}-\d\d-\d\d$/.test(s)) return Date.parse(`${s}T00:00:00Z`);
  const hasTz = /([zZ]|[+-]\d\d:?\d\d)$/.test(s);
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  return Date.parse(hasTz ? iso : `${iso}Z`);
}
function eventMs(ev) {
  for (const k of ["timestamp", "datetime", "dateTime", "date", "time", "at", "start"]) {
    const ms = toMs(ev[k]);
    if (Number.isFinite(ms)) return ms;
  }
  return NaN;
}

/* ---------- forecast fallback: used only when the worker's own forecast copy is missing ---------- */
const FF_URLS = ["https://nfs.faireconomy.media/ff_calendar_thisweek.json", "https://nfs.faireconomy.media/ff_calendar_nextweek.json"];
let ffCache = { at: 0, rows: null };
function parseFfNum(t) {
  const m = /^[+]?(-?\d*\.?\d+)\s*([%KMBT]?)$/i.exec(String(t == null ? "" : t).trim().replace(/,/g, ""));
  return m ? { value: Number(m[1]), unit: m[2].toUpperCase() } : null;
}
async function fillForecasts(events, feed) {
  const missing = events.filter((e) => !e.holiday && e.estimate == null && e.timestamp > Date.now() - 86400000);
  if (!missing.length || (feed && feed.ok && !feed.stale)) return events;
  if (!ffCache.rows || Date.now() - ffCache.at > 30 * 60000) {
    const rows = [];
    for (const u of FF_URLS) {
      try {
        const r = await fetch(u);
        const l = r.ok ? await r.json() : null;
        if (Array.isArray(l)) rows.push(...l);
      } catch (e) {
        /* the browser may not be allowed to read the feed: then nothing changes */
      }
    }
    ffCache = { at: Date.now() - (rows.length ? 0 : 25 * 60000), rows }; // a failed attempt is retried after about 5 minutes
  }
  if (!ffCache.rows.length) return events;
  const norm = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const byKey = new Map();
  ffCache.rows.forEach((x) => {
    const ts = Date.parse(x.date);
    const f = parseFfNum(x.forecast);
    if (Number.isFinite(ts) && f) byKey.set(`${String(x.country).toUpperCase()}|${norm(x.title)}|${ts}`, f);
  });
  return events.map((e) => {
    if (e.holiday || e.estimate != null) return e;
    const f = byKey.get(`${String(e.currency).toUpperCase()}|${norm(e.event)}|${e.timestamp}`);
    if (!f) return e;
    const u = typeof e.unit === "string" ? e.unit : "";
    if (f.unit === u) return { ...e, estimate: f.value };
    if (f.unit === "M" && u === "K") return { ...e, estimate: f.value * 1000 };
    if (f.unit === "K" && u === "M") return { ...e, estimate: f.value / 1000 };
    return e;
  });
}
function currencyOf(ev) {
  const c = String(ev.currency || "").toUpperCase();
  if (c) return c;
  const k = String(ev.country || "").toUpperCase();
  return CCY_BY_COUNTRY[k] || k;
}
function impactOf(ev) {
  const v = ev.impact ?? ev.importance ?? ev.volatility ?? ev.priority;
  if (typeof v === "number") return v >= 3 ? 3 : v === 2 ? 2 : v === 1 ? 1 : 0;
  const s = String(v || "").toLowerCase();
  if (s.includes("high") || s === "3") return 3;
  if (s.includes("med") || s === "2") return 2;
  if (s.includes("low") || s === "1") return 1;
  return 0;
}
// Central-bank news is worded differently per bank ("Main Refinancing Rate", "Official Bank Rate", "Cash Rate", "... Speaks", "... Minutes"),
// so it is recognised by the bank's name or by those phrases.
const CB_RE = /\b(fed|fomc|ecb|boe|boj|rba|rbnz|snb|boc|pboc|riksbank|norges|nbp|cbrt|sarb|banxico|copom|rbi|bok|mas|hkma|lpr|loan prime|mpc|governor|gov|chair|monetary policy|policy rate|funds rate|refinancing rate|overnight rate|deposit rate|cash rate|bank rate|rate decision|rate statement|summary of opinions|ocr|interest rate|press conference|minutes)\b/;
function categoryOf(title) {
  const t = title.toLowerCase();
  if (CB_RE.test(t)) return "Central Bank";
  if (/(housing|home sales|home loans|new home|existing home|pending home|house price|building permits|building consents|mortgage|halifax|nationwide hpi|rics)/.test(t)) return "Housing";
  if (/(payroll|unemployment|jobless|claims|earnings|jolts|job openings|employment|labour|labor|wage|jobs|adp|participation|claimant)/.test(t)) return "Employment";
  if (/(cpi|ppi|pce|price|inflation|deflator)/.test(t)) return "Inflation";
  if (/(confidence|sentiment|ifo|zew|tankan|michigan|uom|sentix|business climate|business conditions)/.test(t)) return "Sentiment";
  if (/(gdp|retail|industrial|production|pmi|manufacturing|services|trade balance|current account|orders|factory|ism|output|sales|spending|income)/.test(t)) return "Growth";
  return "Other";
}
const CATEGORIES = ["Central Bank", "Inflation", "Employment", "Growth", "Sentiment", "Housing", "Holiday", "Other"];
function normalize(ev, i) {
  if (!ev || typeof ev !== "object") return null;
  const ms = eventMs(ev);
  const title = ev.event ?? ev.title ?? ev.name ?? ev.indicator;
  if (!Number.isFinite(ms) || !title) return null;
  const pair = parsePair(ev.pair || ev.symbol || currencyOf(ev));
  const holiday = ev.holiday === true;
  return {
    id: ev.id ?? `${ms}-${i}`,
    indicator: ev.indicator && typeof ev.indicator === "string" ? ev.indicator : "",
    ms,
    title: String(title),
    ccy: pair ? `${pair[0]}/${pair[1]}` : currencyOf(ev),
    pair,
    impact: impactOf(ev),
    cat: holiday ? "Holiday" : categoryOf(String(title)),
    holiday,
    // a holiday is a calendar date (in the bank's own country), not a moment, so it is grouped by that date in every time zone
    dayKey: holiday && typeof ev.day === "string" && /^\d{4}-\d\d-\d\d$/.test(ev.day) ? ev.day : "",
    actual: ev.actual,
    forecast: ev.estimate ?? ev.forecast ?? ev.consensus,
    previous: ev.previous ?? ev.prior,
    unit: typeof ev.unit === "string" && ev.unit.length <= 4 ? ev.unit : "",
    change: typeof ev.change === "number" ? ev.change : null,
    status: ev.status || "",
  };
}
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
function fmtVal(v, unit) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return `${v.toLocaleString(undefined, { maximumFractionDigits: 3 })}${unit || ""}`;
  return String(v);
}
function countdown(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
function surpriseOf(ev) {
  if (!isNum(ev.actual)) return null;
  const vs = isNum(ev.forecast) ? "forecast" : isNum(ev.previous) ? "previous" : null;
  if (!vs) return null;
  const d = Number((ev.actual - (vs === "forecast" ? ev.forecast : ev.previous)).toFixed(4));
  if (d === 0) return { dir: 0, text: `In line with ${vs}` };
  return { dir: d > 0 ? 1 : -1, text: `${d > 0 ? "Above" : "Below"} ${vs} by ${fmtVal(Math.abs(d), ev.unit)}` };
}

/* ---------- dates in the chosen time zone (as plain YYYY-MM-DD text, so no daylight-saving surprises) ---------- */
const legsOf = (e) => (e.pair ? e.pair : [e.ccy]);
const ymd = (ms, tz) => new Date(ms).toLocaleDateString("en-CA", { timeZone: tz });
const shiftYmd = (s, n) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const dowOf = (s) => new Date(`${s}T00:00:00Z`).getUTCDay();
const timeIn = (ms, tz) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz });
const longDay = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
function offsetLabel(ms, tz) {
  try {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date(ms)).find((x) => x.type === "timeZoneName");
    return p ? p.value : "";
  } catch (e) {
    return "";
  }
}
function updatedText(ms, now) {
  if (!ms) return "";
  const m = Math.floor((now - ms) / 60000);
  return m < 1 ? "Updated just now" : m < 60 ? `Updated ${m} min ago` : `Updated ${Math.floor(m / 60)}h ago`;
}

/* ---------- plain-language notes shown when a row is opened ---------- */
function infoFor(ev) {
  const t = ev.title.toLowerCase();
  const cur = CCY_META[ev.ccy] ? CCY_META[ev.ccy].name : ev.ccy;
  const bank = CCY_META[ev.ccy] ? CCY_META[ev.ccy].bank : "the central bank";
  if (ev.pair)
    return {
      what: `News that affects the ${ev.ccy} pair, so it can move both currencies.`,
      why: "A pair moves on the difference between its two currencies, so news about either side can change the price.",
      how: `Think about which currency the news helps. Good news for ${ev.pair[0]} tends to lift ${ev.ccy}; good news for ${ev.pair[1]} tends to push it down.`,
    };
  const stronger = "A result stronger than the forecast usually supports the currency, a weaker one usually weighs on it.";
  const inflationHow = "A higher reading than forecast often raises expectations of tighter policy and tends to support the currency; a lower one often does the opposite.";
  const inflationWhy = "Central banks set interest rates with inflation in mind, so a surprise here can change rate expectations quickly.";
  const jobsWhy = "Jobs data shows how healthy the economy is and shapes what the central bank does next, so it can move the currency, gold and indices.";
  if (/press conference/.test(t))
    return {
      what: `A live question-and-answer session where officials from ${bank} explain their latest decision.`,
      why: "The tone and hints about future rate moves can move markets after the decision itself, often with sharp swings.",
      how: "There is no number to compare. Watch whether officials sound more cautious or more confident than expected.",
    };
  if (/rate decision|\bocr\b|cash rate|bank rate|policy rate|funds rate|refinancing rate|overnight rate|deposit rate|interest rate/.test(t))
    return {
      what: `The ${bank} announces whether it raises, cuts or holds its main interest rate for ${cur}.`,
      why: "Interest rates are one of the biggest drivers of a currency over time. The statement and tone can matter as much as the rate itself.",
      how: "Compare the decision with what the market expected. A hold can still move price if the guidance sounds hawkish (more rate rises) or dovish (more cuts).",
    };
  if (/non-farm|payroll/.test(t))
    return { what: "How many jobs the US economy added or lost last month, not counting farm work.", why: jobsWhy, how: stronger };
  if (/unemployment rate/.test(t))
    return { what: "The share of people who want a job but can't find one.", why: jobsWhy, how: "Here lower is the stronger result: a lower rate than forecast usually supports the currency." };
  if (/employment change/.test(t))
    return { what: "How many jobs the economy added or lost over the period.", why: jobsWhy, how: stronger };
  if (/wage price index/.test(t))
    return { what: "How much the price paid for wages and salaries changed over the quarter.", why: "Rising wages can keep inflation high, which central banks watch closely.", how: "Higher than forecast often points to tighter policy and tends to support the currency." };
  if (/earnings/.test(t))
    return { what: "How much average pay per hour changed over the month.", why: "Rising wages can keep inflation high, which central banks watch closely.", how: "Higher than forecast often points to tighter policy and tends to support the currency." };
  if (/jolts|job openings/.test(t))
    return { what: "The number of open job positions employers are trying to fill.", why: jobsWhy, how: stronger };
  if (/jobless claims/.test(t))
    return { what: "How many people filed a first-time claim for unemployment benefits last week.", why: "It is one of the quickest signals of how the job market is holding up.", how: "Lower is the stronger result: fewer claims than forecast usually supports the currency." };
  if (/core cpi/.test(t))
    return { what: "Consumer prices excluding food and energy, which swing a lot. m/m is the change on last month, y/y on a year ago.", why: inflationWhy, how: inflationHow };
  if (/cpi/.test(t))
    return { what: "How much the prices consumers pay changed. m/m is the change on last month, y/y on a year ago.", why: inflationWhy, how: inflationHow };
  if (/core pce/.test(t))
    return { what: "The Fed's preferred inflation measure, excluding food and energy.", why: inflationWhy, how: inflationHow };
  if (/pce/.test(t))
    return { what: "A broad measure of how prices of what people spend on have changed.", why: inflationWhy, how: inflationHow };
  if (/ppi/.test(t))
    return { what: "How much prices changed for businesses at the producer level, often an early sign for consumer prices.", why: inflationWhy, how: inflationHow };
  if (/gdp/.test(t))
    return { what: "How fast the whole economy grew, shown as an annualized rate for the quarter.", why: "It is the broadest picture of economic health and affects rate expectations.", how: stronger };
  if (/retail sales/.test(t))
    return { what: "The total amount spent in shops and online, a direct read on consumer demand.", why: "Consumer spending drives most of the economy, so it moves growth and rate expectations.", how: stronger };
  if (/industrial production/.test(t))
    return { what: "The output of factories, mines and utilities.", why: "It shows how strong the production side of the economy is.", how: stronger };
  if (/speaks|speech|testifies/.test(t))
    return {
      what: `A scheduled public talk or testimony by an official from ${bank}.`,
      why: "Officials often hint at the next rate move, and unscripted remarks can move the currency within seconds.",
      how: "There is no number to compare. Listen for a change in tone about inflation, jobs or rate plans compared with what the market expects.",
    };
  if (/minutes/.test(t))
    return {
      what: `A written record of what ${bank} policymakers discussed at their last meeting.`,
      why: "It shows how divided the committee was and how close it came to changing rates, which can shift rate expectations.",
      how: "Look for hints about future rate moves. Hawkish wording (leaning to higher rates) tends to support the currency, dovish wording tends to weigh on it.",
    };
  if (/pmi|\bism\b/.test(t))
    return {
      what: "A survey of purchasing managers about business conditions. Above 50 means the sector is growing, below 50 means it is shrinking.",
      why: "It is one of the earliest signals of how the economy is doing, published before most hard data.",
      how: stronger,
    };
  if (/trade balance|current account/.test(t))
    return {
      what: "The gap between what the country sells abroad and what it buys. A surplus means it sells more than it buys.",
      why: "Foreign buyers need the local currency to pay for exports, so a bigger surplus tends to support it.",
      how: "A better balance than forecast usually supports the currency.",
    };
  if (/confidence|sentiment|ifo|zew|tankan|michigan|uom|sentix|business climate/.test(t))
    return {
      what: "A survey of how optimistic consumers or businesses feel about the economy.",
      why: "Confident people spend and invest more, so these surveys give an early read on growth.",
      how: stronger,
    };
  if (/housing|home sales|house price|building permits|building consents|mortgage|hpi/.test(t))
    return {
      what: "A measure of the housing market: sales, new building or prices.",
      why: "Housing reacts strongly to interest rates, so it shows how rate changes are feeding through to the economy.",
      how: stronger,
    };
  return {
    what: `A scheduled economic release for ${cur}.`,
    why: "Releases like this can change expectations about growth, inflation and interest rates.",
    how: "Compare the actual figure with the forecast and the previous number to see whether it surprised the market.",
  };
}

/* ---------- small UI pieces ---------- */
const fieldBase = {
  boxSizing: "border-box", padding: "8px 11px", borderRadius: 10, border: `1px solid ${palette.border}`, background: tint(palette.text, 4),
  color: palette.text, fontSize: 12, fontFamily: sans, outline: "none", minWidth: 0,
};
const capStyle = { fontSize: 10.5, fontWeight: 700, color: palette.textMuted, marginBottom: 6 };

function ImpactBars({ level }) {
  const col = level >= 3 ? palette.red : level === 2 ? AMBER : palette.textFaint;
  const names = ["No impact", "Low impact", "Medium impact", "High impact"];
  return (
    <span role="img" aria-label={names[level]} title={names[level]} style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 13, flexShrink: 0 }}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ width: 3, height: 4 + i * 3, borderRadius: 1.5, background: i <= level ? col : tint(palette.text, 14) }} />
      ))}
    </span>
  );
}

function Tag({ children }) {
  return (
    <span style={{ display: "inline-block", marginLeft: 8, padding: "1px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700, color: palette.textFaint, background: tint(palette.text, 6), verticalAlign: "middle", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Dropdown({ label, text, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("touchstart", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", minWidth: 0 }}>
      <div style={capStyle}>{label}</div>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ ...fieldBase, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer", textAlign: "left", fontWeight: 600 }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
        <ChevronDown size={14} aria-hidden="true" style={{ flexShrink: 0, color: palette.textFaint, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute", zIndex: 5, top: "calc(100% + 6px)", left: 0, right: 0, minWidth: 190, maxHeight: 300, overflowY: "auto", padding: 5, borderRadius: 12,
            background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow === "none" ? "0 12px 32px rgba(0,0,0,.45)" : palette.shadow,
          }}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

function Option({ on, onClick, children }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={on}
      className="ec-opt"
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 9px", borderRadius: 8, border: 0, background: on ? tint(palette.gold, 12) : "transparent", color: on ? palette.gold : palette.text, fontSize: 12, fontWeight: 600, fontFamily: sans, cursor: "pointer", textAlign: "left" }}
    >
      <span style={{ display: "grid", placeItems: "center", width: 15, height: 15, borderRadius: 4, border: `1px solid ${on ? palette.gold : palette.border}`, background: on ? tint(palette.gold, 20) : "transparent", flexShrink: 0 }}>
        {on && <Check size={11} />}
      </span>
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <div aria-hidden="true" style={{ padding: "6px 16px" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${palette.border}` }}>
          <span style={{ width: 44, height: 10, borderRadius: 5, background: tint(palette.text, 8) }} />
          <span style={{ width: 36, height: 16, borderRadius: 6, background: tint(palette.text, 8) }} />
          <span style={{ flex: 1, height: 10, borderRadius: 5, background: tint(palette.text, 8), maxWidth: `${50 + ((i * 13) % 35)}%` }} />
        </div>
      ))}
    </div>
  );
}
const Notice = ({ children }) => <div style={{ padding: "40px 24px", textAlign: "center", color: palette.textMuted, fontSize: 12, lineHeight: 1.55 }}>{children}</div>;

/* ---------- event rows ---------- */
const COLS = "88px 112px minmax(0, 1fr) 52px 78px 78px 78px";

function ValueCell({ label, v, strong, ev, compact }) {
  const empty = v == null || v === "";
  const pending = strong && empty && ev.status === "pending";
  return (
    <div style={{ textAlign: compact ? "left" : "right", fontVariantNumeric: "tabular-nums", minWidth: 0 }}>
      {compact && <div style={{ fontSize: 10, color: palette.textFaint, marginBottom: 1 }}>{label}</div>}
      <div style={{ fontSize: pending ? 12 : 13, fontWeight: strong ? 800 : 600, color: pending ? palette.gold : empty ? palette.textFaint : strong ? palette.text : palette.textMuted }}>
        {pending ? "Pending" : fmtVal(v, ev.unit)}
      </div>
    </div>
  );
}

function Detail({ ev, history, tz, onClose, compact }) {
  const info = infoFor(ev);
  const sup = surpriseOf(ev);
  const recent = history.filter((h) => h.indicator === ev.indicator && h.ts < ev.ms).slice(0, 5);
  const head = (t) => <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color: palette.textFaint, marginBottom: 5 }}>{t}</div>;
  const body = (t) => <div style={{ fontSize: 12, lineHeight: 1.55, color: palette.textMuted, marginBottom: 14 }}>{t}</div>;
  return (
    <div style={{ margin: compact ? "0 10px 12px" : "0 12px 14px", padding: compact ? "14px 14px 4px" : "16px 18px 6px", borderRadius: 14, background: tint(palette.text, 4), border: `1px solid ${palette.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        {ev.pair ? <PairIcon a={ev.pair[0]} b={ev.pair[1]} w={26} /> : <Flag ccy={ev.ccy} w={26} />}
        <span style={{ fontSize: 14, fontWeight: 800, color: palette.text }}>{ev.title}</span>
        {ev.pair ? <Tag>Currency pair</Tag> : <Tag>{CCY_META[ev.ccy] ? CCY_META[ev.ccy].name : ev.ccy}</Tag>}
        <Tag>{ev.ccy}</Tag>
        <Tag>{ev.cat}</Tag>
        <button type="button" aria-label="Close details" onClick={onClose} style={{ marginLeft: "auto", display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, border: `1px solid ${palette.border}`, background: "transparent", color: palette.textMuted, cursor: "pointer" }}>
          <X size={14} />
        </button>
      </div>
      {sup && (
        <div style={{ margin: "-4px 0 14px", fontSize: 11.5, fontWeight: 800, color: palette.text }}>
          {sup.dir > 0 ? "▲ " : sup.dir < 0 ? "▼ " : "● "}
          {sup.text}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "minmax(0, 1.7fr) minmax(0, 1fr)", gap: compact ? 0 : 28 }}>
        <div>
          {head("WHAT IT IS")}
          {body(info.what)}
          {head("WHY IT MATTERS")}
          {body(info.why)}
          {head("HOW TO READ IT")}
          {body(info.how)}
        </div>
        <div>
          {head("RECENT RELEASES")}
          {recent.length === 0 ? (
            <div style={{ fontSize: 11.5, lineHeight: 1.55, color: palette.textFaint, marginBottom: 14 }}>
              No earlier figures stored yet.{isNum(ev.previous) ? ` Previous: ${fmtVal(ev.previous, ev.unit)}` : ""}
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              {recent.map((h) => (
                <div key={h.ts} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", borderBottom: `1px solid ${palette.border}`, fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ color: palette.textFaint }}>{new Date(h.ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", timeZone: tz })}</span>
                  <span style={{ fontWeight: 800, color: palette.text }}>{fmtVal(h.actual, ev.unit)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventRow({ ev, isNext, compact, now, tz, mode, open, onToggle, history }) {
  const accent = isNext ? { boxShadow: `inset 3px 0 0 ${palette.gold}`, background: tint(palette.gold, 6) } : null;
  const timeText = mode === "countdown" ? (ev.ms > now ? `in ${countdown(ev.ms - now)}` : `${countdown(now - ev.ms)} ago`) : timeIn(ev.ms, tz);
  const toggle = {
    role: "button",
    tabIndex: 0,
    "aria-expanded": open,
    onClick: onToggle,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    },
  };
  const ccyCell = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {ev.pair ? <PairIcon a={ev.pair[0]} b={ev.pair[1]} w={20} /> : <Flag ccy={ev.ccy} w={20} />}
      <span style={{ fontSize: 11, fontWeight: 800, color: palette.text, whiteSpace: "nowrap" }}>{ev.ccy}</span>
    </span>
  );
  return (
    <div>
      {compact ? (
        <div {...toggle} className="ec-row" style={{ padding: "12px 16px", borderBottom: open ? "none" : `1px solid ${palette.border}`, cursor: "pointer", ...accent }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: palette.textMuted, fontVariantNumeric: "tabular-nums" }}>{timeText}</span>
            {ccyCell}
            <ImpactBars level={ev.impact} />
          </div>
          <div style={{ margin: "7px 0 9px", fontSize: 12.5, fontWeight: 700, color: palette.text, lineHeight: 1.35 }}>
            {ev.title}
            <Tag>{ev.cat}</Tag>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <ValueCell label="Actual" v={ev.actual} strong ev={ev} compact />
            <ValueCell label="Forecast" v={ev.forecast} ev={ev} compact />
            <ValueCell label="Previous" v={ev.previous} ev={ev} compact />
          </div>
        </div>
      ) : (
        <div {...toggle} className="ec-row" style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, alignItems: "center", padding: "12px 18px", borderBottom: open ? "none" : `1px solid ${palette.border}`, cursor: "pointer", ...accent }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: palette.textMuted, fontVariantNumeric: "tabular-nums" }}>{timeText}</span>
          {ccyCell}
          <div style={{ minWidth: 0, fontSize: 12.5, fontWeight: 700, color: palette.text, lineHeight: 1.35 }}>
            {ev.title}
            <Tag>{ev.cat}</Tag>
          </div>
          <ImpactBars level={ev.impact} />
          <ValueCell label="Actual" v={ev.actual} strong ev={ev} />
          <ValueCell label="Forecast" v={ev.forecast} ev={ev} />
          <ValueCell label="Previous" v={ev.previous} ev={ev} />
        </div>
      )}
      {open && <Detail ev={ev} history={history} tz={tz} compact={compact} onClose={onToggle} />}
    </div>
  );
}

function HolidayRow({ ev, compact }) {
  const ccyCell = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <Flag ccy={ev.ccy} w={20} />
      <span style={{ fontSize: 11, fontWeight: 800, color: palette.text, whiteSpace: "nowrap" }}>{ev.ccy}</span>
    </span>
  );
  const chip = (
    <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, color: AMBER, background: tint(AMBER, 16), whiteSpace: "nowrap" }}>Holiday</span>
  );
  const note = "Market holiday: liquidity can be thin and spreads wider.";
  if (compact) {
    return (
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${palette.border}`, background: tint(AMBER, 5) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: palette.textMuted }}>All day</span>
          {ccyCell}
          {chip}
        </div>
        <div style={{ margin: "7px 0 3px", fontSize: 12.5, fontWeight: 700, color: palette.text, lineHeight: 1.35 }}>{ev.title}</div>
        <div style={{ fontSize: 11, color: palette.textFaint }}>{note}</div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, alignItems: "center", padding: "11px 18px", borderBottom: `1px solid ${palette.border}`, background: tint(AMBER, 5) }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: palette.textMuted }}>All day</span>
      {ccyCell}
      <div style={{ gridColumn: "3 / -1", minWidth: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: palette.text, lineHeight: 1.35 }}>{ev.title}</span>
        {chip}
        <span style={{ fontSize: 11, color: palette.textFaint }}>{note}</span>
      </div>
    </div>
  );
}

/* ---------- options ---------- */
const RANGES = [
  { id: "yesterday", label: "Yesterday" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "This Week" },
  { id: "next", label: "Next Week" },
  { id: "custom", label: "Custom dates" },
];
const IMPACTS = [
  { id: "all", label: "All importance", min: 0 },
  { id: "low", label: "Low and above", min: 1 },
  { id: "medium", label: "Medium and above", min: 2 },
  { id: "high", label: "High", min: 3 },
];


/* ---------- trading sessions ---------- */
const SESSIONS = [
  { id: "asia", name: "Asia", tz: "Asia/Tokyo", open: [9, 0], close: [18, 0], color: "#f472b6", of: [{ city: "Sydney", tz: "Australia/Sydney", open: [8, 0], close: [17, 0] }, { city: "Tokyo", tz: "Asia/Tokyo", open: [9, 0], close: [18, 0] }], pairs: ["AUD/USD", "NZD/USD", "USD/JPY", "AUD/JPY"], note: "Sydney and Tokyo combined. Opens the forex week; AUD, NZD and JPY lead." },
  { id: "london", name: "London", tz: "Europe/London", open: [8, 0], close: [17, 0], color: "#a78bfa", pairs: ["EUR/USD", "GBP/USD", "EUR/GBP", "USD/CHF"], note: "The deepest market. EUR, GBP and CHF move most; biggest daily range starts here." },
  { id: "newyork", name: "New York", tz: "America/New_York", open: [8, 0], close: [17, 0], color: "#fbbf24", pairs: ["EUR/USD", "USD/CAD", "USD/JPY", "XAU/USD"], note: "USD data and Fed news. Busiest while it overlaps London." },
];
function zonedParts(ms, timeZone) {
  const p = {};
  new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })
    .formatToParts(new Date(ms)).forEach((x) => { if (x.type !== "literal") p[x.type] = Number(x.value); });
  return p;
}
function wallToUtc(y, m, d, h, mi, timeZone) {
  const target = Date.UTC(y, m - 1, d, h, mi);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const z = zonedParts(guess, timeZone);
    guess += target - Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
  }
  return guess;
}
/* open windows (UTC ms) of a session whose local date offset is within [from, to] days of now's local date; weekdays only */
function sessionWindows(s, now, from, to) {
  if (s.of) {
    const all = s.of.flatMap((c) => sessionWindows(c, now, from, to)).sort((a, b) => a.start - b.start);
    const out = [];
    all.forEach((w) => {
      const last = out[out.length - 1];
      if (last && w.start <= last.end) last.end = Math.max(last.end, w.end);
      else out.push({ ...w });
    });
    return out;
  }
  const z = zonedParts(now, s.tz);
  const out = [];
  for (let off = from; off <= to; off++) {
    const base = new Date(Date.UTC(z.year, z.month - 1, z.day + off));
    const wd = base.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    const y = base.getUTCFullYear(), m = base.getUTCMonth() + 1, d = base.getUTCDate();
    out.push({ start: wallToUtc(y, m, d, s.open[0], s.open[1], s.tz), end: wallToUtc(y, m, d, s.close[0], s.close[1], s.tz) });
  }
  return out;
}
function sessionStatus(s, now) {
  const w = sessionWindows(s, now, -1, 8);
  const cur = w.find((x) => now >= x.start && now < x.end);
  if (cur) return { open: true, end: cur.end };
  const nxt = w.find((x) => x.start > now);
  return { open: false, start: nxt ? nxt.start : 0 };
}
function anySessionOpen(now) {
  return SESSIONS.some((s) => sessionStatus(s, now).open);
}
function span(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${mi}m` : `${mi}m`;
}
function hm(ms, timeZone) {
  return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
}

function SessionsView({ now, tz, isDesktop, events = [] }) {
  const z = zonedParts(now, tz);
  const dayStart = wallToUtc(z.year, z.month, z.day, 0, 0, tz);
  const dayEnd = wallToUtc(z.year, z.month, z.day + 1, 0, 0, tz);
  const len = dayEnd - dayStart;
  const pct = (ms) => Math.min(100, Math.max(0, ((ms - dayStart) / len) * 100));
  const data = SESSIONS.map((s) => {
    const st = sessionStatus(s, now);
    const segs = sessionWindows(s, now, -2, 2).filter((w) => w.end > dayStart && w.start < dayEnd).map((w) => ({ a: Math.max(w.start, dayStart), b: Math.min(w.end, dayEnd), w }));
    return { s, st, segs };
  });
  const overlaps = [];
  for (let i = 0; i < data.length; i++) for (let j = i + 1; j < data.length; j++) {
    data[i].segs.forEach((x) => data[j].segs.forEach((y) => {
      const a = Math.max(x.a, y.a), b = Math.min(x.b, y.b);
      if (b > a) overlaps.push({ a, b, label: `${data[i].s.name} + ${data[j].s.name}` });
    }));
  }
  const openNow = data.filter((d) => d.st.open);
  const nowUtcDay = new Date(now).getUTCDay();
  const weekendHere = openNow.length === 0 && (nowUtcDay === 6 || nowUtcDay === 0 || (nowUtcDay === 5 && new Date(now).getUTCHours() >= 21));
  const live = openNow.length > 0;
  const nextOpen = data.filter((d) => !d.st.open && d.st.start).sort((a, b) => a.st.start - b.st.start)[0];
  const overlapNow = openNow.length > 1 ? { label: openNow.map((d) => d.s.name).join(" + "), end: Math.min(...openNow.map((d) => d.st.end)) } : null;
  let nextOverlap = null;
  if (!overlapNow) {
    const ws = SESSIONS.map((s) => ({ s, w: sessionWindows(s, now, -1, 8) }));
    for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) {
      ws[i].w.forEach((x) => ws[j].w.forEach((y) => {
        const a = Math.max(x.start, y.start), b = Math.min(x.end, y.end);
        if (b > a && b > now && (!nextOverlap || Math.max(a, now) < nextOverlap.start)) nextOverlap = { start: Math.max(a, now), label: `${ws[i].s.name} + ${ws[j].s.name}` };
      }));
    }
  }
  const newsToday = events.filter((e) => !e.holiday && e.impact >= 3 && e.ms >= dayStart && e.ms < dayEnd).sort((a, b) => a.ms - b.ms);
  const sessionOf = (ms) => data.filter((d) => d.segs.some((g) => ms >= g.a && ms < g.b)).map((d) => d.s.name);
  const hours = isDesktop ? [0, 3, 6, 9, 12, 15, 18, 21, 24] : [0, 6, 12, 18, 24];
  const hourAt = (i) => (i === 24 ? 100 : pct(wallToUtc(z.year, z.month, z.day, i, 0, tz)));
  const nowPct = pct(now);
  const dayKey = (ms) => { const q = zonedParts(ms, tz); return q.year * 10000 + q.month * 100 + q.day; };
  const range = (w) => `${hm(w.start, tz)}–${hm(w.end, tz)}${dayKey(w.end) > dayKey(w.start) ? " +1" : ""}`;
  const labelW = isDesktop ? 78 : 0;
  const sec = { padding: isDesktop ? "16px 20px" : "14px 14px", borderTop: `1px solid ${palette.border}` };
  const head = { fontSize: 11.5, fontWeight: 800, color: palette.text, marginBottom: 10 };
  return (
    <div style={{ border: `1px solid ${palette.border}`, borderRadius: 16, overflow: "hidden", background: palette.surface, boxShadow: palette.shadow }}>
      <div style={{ padding: isDesktop ? "20px 22px" : "16px 14px", background: `linear-gradient(135deg, ${tint(live ? palette.gold : palette.textFaint, 14)}, ${tint(palette.text, 2)})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: live ? palette.gold : palette.textMuted }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: live ? palette.gold : palette.textFaint, boxShadow: live ? `0 0 0 4px ${tint(palette.gold, 25)}` : "none" }} />
          {live ? "Market open" : weekendHere ? "Weekend · market closed" : "Market closed"}
        </div>
        <div style={{ fontSize: isDesktop ? 24 : 19.5, fontWeight: 800, color: palette.text, marginTop: 6, lineHeight: 1.2 }}>
          {live ? openNow.map((d) => d.s.name).join(" · ") : nextOpen ? `${nextOpen.s.name} opens in ${span(nextOpen.st.start - now)}` : "No session scheduled"}
        </div>
        <div style={{ fontSize: 12, color: palette.textMuted, marginTop: 4, lineHeight: 1.45 }}>
          {overlapNow ? `${overlapNow.label} overlap for another ${span(overlapNow.end - now)}: highest volume and tightest spreads of the day.` : live ? `One session active right now.${nextOverlap ? ` Next overlap, ${nextOverlap.label}, in ${span(nextOverlap.start - now)}.` : ""}` : `Forex trades Monday to Friday. Sessions follow each market's local weekday and daylight-saving time.${nextOverlap ? ` First overlap: ${nextOverlap.label}.` : ""}`}
        </div>
        <div style={{ fontSize: 11, color: palette.textFaint, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>Your time <b style={{ color: palette.text }}>{hm(now, tz)}</b> · {tz}</div>
      </div>

      <div style={sec}>
        <div style={head}>Today in {tz}</div>
        <div style={{ position: "relative", paddingLeft: labelW }}>
          {data.map(({ s, st, segs }) => {
            const w = sessionWindows(s, now, -1, 8).find((x) => (st.open ? now >= x.start && now < x.end : x.start === st.start));
            return (
              <div key={s.id} style={{ position: "relative", padding: isDesktop ? "8px 0" : "6px 0" }}>
                {isDesktop && <span style={{ position: "absolute", left: -labelW, top: 8, width: 70, fontSize: 11, fontWeight: 700, color: palette.textMuted, lineHeight: "14px" }}>{s.name}</span>}
                {!isDesktop && (
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 4, fontSize: 10.5, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, color: palette.text }}>
                      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: s.color, opacity: st.open ? 1 : 0.55 }} />
                      {s.name}
                    </span>
                    {w && <span style={{ color: palette.textFaint }}>{range(w)}</span>}
                  </div>
                )}
                <div style={{ position: "relative", height: 14, borderRadius: 99, background: tint(palette.text, 6) }}>
                  {segs.map((g, i) => (
                    <div key={i} title={`${s.name} ${range(g.w)}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${pct(g.a)}%`, width: `${pct(g.b) - pct(g.a)}%`, borderRadius: 99, background: s.color, opacity: st.open ? 1 : 0.55 }} />
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ position: "relative", padding: isDesktop ? "6px 0" : "6px 0 4px" }}>
            {isDesktop ? <span style={{ position: "absolute", left: -labelW, top: 4, width: 70, fontSize: 10.5, fontWeight: 700, color: palette.textFaint, lineHeight: "12px" }}>Overlap</span> : <div style={{ fontSize: 10.5, fontWeight: 800, color: palette.textMuted, marginBottom: 4 }}>Overlap</div>}
            <div style={{ position: "relative", height: 8, borderRadius: 99, background: tint(palette.text, 4) }}>
              {overlaps.map((o, i) => (
                <div key={i} title={`${o.label} ${hm(o.a, tz)}–${hm(o.b, tz)}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${pct(o.a)}%`, width: `${pct(o.b) - pct(o.a)}%`, borderRadius: 99, background: palette.gold }} />
              ))}
            </div>
          </div>
          <div style={{ position: "relative", padding: isDesktop ? "6px 0" : "6px 0 4px" }}>
            {isDesktop ? <span style={{ position: "absolute", left: -labelW, top: 4, width: 70, fontSize: 10.5, fontWeight: 700, color: palette.textFaint, lineHeight: "12px" }}>High impact</span> : <div style={{ fontSize: 10.5, fontWeight: 800, color: palette.textMuted, marginBottom: 4 }}>High impact</div>}
            <div style={{ position: "relative", height: 12 }}>
              {newsToday.map((e) => (
                <span key={e.id} title={`${hm(e.ms, tz)} ${e.ccy} ${e.title}`} style={{ position: "absolute", left: `${pct(e.ms)}%`, top: 1, width: 10, height: 10, marginLeft: -5, borderRadius: 99, background: "#ef4444", boxShadow: `0 0 0 2px ${palette.surface}` }} />
              ))}
            </div>
          </div>
          <div style={{ position: "relative", height: 18, marginTop: 4 }}>
            {hours.map((h, i) => (
              <span key={h} style={{ position: "absolute", left: `${hourAt(h)}%`, transform: i === 0 ? "none" : i === hours.length - 1 ? "translateX(-100%)" : "translateX(-50%)", fontSize: 10, color: palette.textFaint, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{String(h % 24).padStart(2, "0")}:00</span>
            ))}
          </div>
          {/* hour gridlines + now marker, drawn over the bars only */}
          <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 22, left: labelW, right: 0, pointerEvents: "none" }}>
            {hours.slice(1, -1).map((h) => (
              <span key={h} style={{ position: "absolute", top: 0, bottom: 0, left: `${hourAt(h)}%`, width: 1, background: tint(palette.text, 7) }} />
            ))}
            <span style={{ position: "absolute", top: -2, bottom: 0, left: `${nowPct}%`, width: 2, marginLeft: -1, background: palette.text, borderRadius: 2, opacity: 0.85 }} />
          </div>
        </div>
      </div>

      <div style={sec}>
        <div style={{ ...head, marginBottom: 6 }}>High-impact news today</div>
        {newsToday.length === 0 ? (
          <div style={{ fontSize: 11.5, color: palette.textFaint }}>No high-impact events scheduled today.</div>
        ) : newsToday.slice(0, 8).map((e, i) => {
          const where = sessionOf(e.ms);
          return (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 11.5, borderTop: i ? `1px solid ${palette.border}` : "none", opacity: e.ms < now ? 0.55 : 1 }}>
              <span style={{ width: 42, flexShrink: 0, fontWeight: 800, color: palette.text, fontVariantNumeric: "tabular-nums" }}>{hm(e.ms, tz)}</span>
              <Flag ccy={e.ccy} w={18} />
              <span style={{ flex: 1, minWidth: 0, color: palette.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
              {isDesktop && <span style={{ color: palette.textFaint, whiteSpace: "nowrap" }}>{where.length ? where.join(" + ") : "Off-session"}</span>}
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, minmax(0, 1fr))" : "1fr", borderTop: `1px solid ${palette.border}` }}>
        {data.map(({ s, st }, idx) => {
          const on = st.open;
          const w = sessionWindows(s, now, -1, 8).find((x) => (on ? now >= x.start && now < x.end : x.start === st.start));
          return (
            <div key={s.id} style={{ padding: isDesktop ? "16px 20px 16px 22px" : "14px 14px 14px 18px", background: on ? tint(s.color, 8) : "transparent", position: "relative", borderTop: !isDesktop && idx ? `1px solid ${palette.border}` : "none", borderLeft: isDesktop && idx ? `1px solid ${palette.border}` : "none" }}>
              <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: s.color, opacity: on ? 1 : 0.4 }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: palette.text }}>{s.name}</div>
                <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99, background: on ? tint(s.color, 22) : tint(palette.text, 6), color: on ? s.color : palette.textMuted, whiteSpace: "nowrap" }}>
                  {on ? `Open · closes in ${span(st.end - now)}` : st.start ? `Closed · opens in ${span(st.start - now)}` : "Closed"}
                </span>
              </div>
              {w && (
                <div style={{ marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: palette.text }}>{range(w)}</div>
                  <div style={{ fontSize: 10.5, color: palette.textFaint, marginTop: 1 }}>your time · {tz}</div>
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 11, color: palette.textMuted, fontVariantNumeric: "tabular-nums" }}>
                {(s.of || [{ city: "Local", ...s }]).map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "2px 0" }}>
                    <span>{s.of ? c.city : s.name} {String(c.open[0]).padStart(2, "0")}:{String(c.open[1]).padStart(2, "0")}–{String(c.close[0]).padStart(2, "0")}:{String(c.close[1]).padStart(2, "0")}</span>
                    <span style={{ color: palette.textFaint, whiteSpace: "nowrap" }}>now {hm(now, c.tz)}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: palette.textFaint, marginTop: 8, lineHeight: 1.45 }}>{s.note}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {s.pairs.map((pr) => {
                  const [a, b] = pr.split("/");
                  return (
                    <span key={pr} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px 3px 5px", borderRadius: 99, border: `1px solid ${palette.border}`, fontSize: 10.5, fontWeight: 700, color: palette.textMuted }}>
                      <PairIcon a={a} b={b} w={14} />
                      {pr}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =====================================================================================
   MOBILE LAYOUT (phones and small tablets). Desktop keeps the table layout above.
   Card-based feed, a "next up" countdown card, and one bottom sheet for all filters.
   ===================================================================================== */
const GOOD = palette.green || "#22c55e";
const BAD = palette.red || "#ef4444";
const INVERSE_RE = /(unemployment|jobless|claims|claimant)/i; // for these, a LOWER number is the stronger result
const MAJORS = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"];
const impactColor = (lvl) => (lvl >= 3 ? palette.red : lvl === 2 ? AMBER : palette.textFaint);
const shortDay = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
const tzName = (tz) => String(tz).split("/").pop().replace(/_/g, " ");

// Colour of the "actual" number: green = better for the currency, red = worse (only when a numeric forecast exists).
function toneOf(ev) {
  const sup = surpriseOf(ev);
  if (!sup || !isNum(ev.forecast) || sup.dir === 0) return { sup, col: palette.text, arrow: sup ? "●" : "" };
  const good = INVERSE_RE.test(ev.title) ? -sup.dir : sup.dir;
  return { sup, col: good > 0 ? GOOD : BAD, arrow: sup.dir > 0 ? "▲" : "▼" };
}

function MChip({ on, onClick, children, label }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      className="ec-ctl"
      onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 40, padding: "0 13px", borderRadius: 99, cursor: "pointer", fontFamily: sans, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${on ? tint(palette.gold, 55) : palette.border}`, background: on ? tint(palette.gold, 14) : tint(palette.text, 4), color: on ? palette.gold : palette.textMuted }}
    >
      {children}
    </button>
  );
}

function SheetTitle({ children }) {
  return <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.7, textTransform: "uppercase", color: palette.textFaint, margin: "20px 0 10px" }}>{children}</div>;
}

function NextUpCard({ ev, now, tz, onOpen }) {
  const left = ev.ms - now;
  const soon = left < 3600000;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="ec-ctl"
      style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: sans, margin: "4px 0 6px", padding: "14px 16px", borderRadius: 18, color: palette.text, border: `1px solid ${tint(palette.gold, soon ? 60 : 32)}`, background: `linear-gradient(135deg, ${tint(palette.gold, soon ? 20 : 12)}, ${tint(palette.text, 2)})` }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 800, letterSpacing: 0.8, color: palette.gold }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: palette.gold, boxShadow: `0 0 0 4px ${tint(palette.gold, 25)}` }} />
          NEXT UP
        </span>
        <ImpactBars level={ev.impact} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
        <span style={{ fontSize: 27.5, fontWeight: 800, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums" }}>{countdown(left)}</span>
        <span style={{ fontSize: 11.5, color: palette.textMuted, fontVariantNumeric: "tabular-nums" }}>at {timeIn(ev.ms, tz)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 8, minWidth: 0 }}>
        {ev.pair ? <PairIcon a={ev.pair[0]} b={ev.pair[1]} w={22} /> : <Flag ccy={ev.ccy} w={22} />}
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, minWidth: 0 }}>
          <b style={{ fontWeight: 800 }}>{ev.ccy}</b> · {ev.title}
        </span>
      </div>
    </button>
  );
}

function MobileEventCard({ ev, isNext, now, tz, open, onToggle, history }) {
  const past = ev.ms <= now;
  const tone = toneOf(ev);
  const bar = impactColor(ev.impact);
  const soon = !past && ev.ms - now < 86400000;
  const pending = isNum(ev.actual) === false && (ev.actual == null || ev.actual === "") && ev.status === "pending";
  const cell = (label, v, strong, first) => {
    const empty = v == null || v === "";
    return (
      <div style={{ padding: "9px 12px", minWidth: 0, borderLeft: first ? "none" : `1px solid ${palette.border}`, fontVariantNumeric: "tabular-nums" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: strong && pending ? 12.5 : 15, fontWeight: strong ? 800 : 700, color: strong ? (pending ? palette.gold : empty ? palette.textFaint : tone.col) : empty ? palette.textFaint : palette.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {strong && pending ? "Pending" : strong && !empty && tone.arrow ? `${tone.arrow} ` : ""}
          {strong && pending ? "" : fmtVal(v, ev.unit)}
        </div>
      </div>
    );
  };
  return (
    <div
      style={{ position: "relative", overflow: "hidden", borderTop: `1px solid ${palette.border}`, background: isNext ? tint(palette.gold, 7) : "transparent", opacity: past && !open ? 0.78 : 1 }}
    >
      <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: bar, opacity: ev.impact ? 1 : 0.5 }} />
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="ec-ctl"
        style={{ padding: "12px 14px 12px 16px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {ev.pair ? <PairIcon a={ev.pair[0]} b={ev.pair[1]} w={22} /> : <Flag ccy={ev.ccy} w={22} />}
          <span style={{ fontSize: 12, fontWeight: 800, color: palette.text }}>{ev.ccy}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: palette.textMuted, fontVariantNumeric: "tabular-nums" }}>{timeIn(ev.ms, tz)}</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 9 }}>
            {soon && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: tint(palette.gold, isNext ? 22 : 12), color: palette.gold, fontVariantNumeric: "tabular-nums" }}>in {countdown(ev.ms - now)}</span>}
            <ImpactBars level={ev.impact} />
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, margin: "9px 0 11px" }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.35, color: palette.text }}>
            {ev.title}
            <Tag>{ev.cat}</Tag>
          </div>
          <ChevronDown size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 3, color: palette.textFaint, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderRadius: 12, background: tint(palette.text, 4), border: `1px solid ${palette.border}` }}>
          {cell("Actual", ev.actual, true, true)}
          {cell("Forecast", ev.forecast, false)}
          {cell("Previous", ev.previous, false)}
        </div>
        {tone.sup && (
          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: tone.col }}>
            {tone.arrow} {tone.sup.text}
          </div>
        )}
      </div>
      {open && <Detail ev={ev} history={history} tz={tz} compact onClose={onToggle} />}
    </div>
  );
}

function MobileHoliday({ ev }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: tint(AMBER, 7), borderTop: `1px solid ${palette.border}` }}>
      <Flag ccy={ev.ccy} w={22} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: palette.text, lineHeight: 1.3 }}>
          {ev.ccy} · {ev.title}
        </div>
        <div style={{ fontSize: 11, color: palette.textMuted, marginTop: 2 }}>Bank holiday: thinner liquidity, wider spreads.</div>
      </div>
      <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, color: AMBER, background: tint(AMBER, 16) }}>Holiday</span>
    </div>
  );
}

function FilterSheet({ onClose, impact, setImpact, ccys, setCcys, currencyOptions, cat, setCat, categoryOptions, tzSel, pickTz, localTz, showHolidays, toggleHolidays, reset, count }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  const flip = (c) => setCcys(ccys.includes(c) ? ccys.filter((x) => x !== c) : [...ccys, c]);
  const majorsOn = MAJORS.every((c) => ccys.includes(c)) && ccys.length === MAJORS.length;
  return (
    <div role="dialog" aria-modal="true" aria-label="Filters" style={{ position: "fixed", inset: 0, zIndex: 100 }}>
      <div className="ec-fade" onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)" }} />
      <div className="ec-sheet" style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90vh", display: "flex", flexDirection: "column", background: palette.surface, borderRadius: "22px 22px 0 0", border: `1px solid ${palette.border}`, borderBottom: 0, boxShadow: "0 -14px 44px rgba(0,0,0,.5)" }}>
        <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 4, background: tint(palette.text, 22), margin: "10px auto 2px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px 6px" }}>
          <div style={{ fontSize: 16.5, fontWeight: 800, color: palette.text }}>Filters</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" className="ec-ctl" onClick={reset} style={{ minHeight: 40, padding: "0 10px", border: 0, background: "transparent", color: palette.gold, fontSize: 13, fontWeight: 800, fontFamily: sans, cursor: "pointer" }}>Reset</button>
            <button type="button" className="ec-ctl" aria-label="Close filters" onClick={onClose} style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 12, border: `1px solid ${palette.border}`, background: "transparent", color: palette.textMuted, cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div style={{ overflowY: "auto", overscrollBehavior: "contain", padding: "0 18px 8px" }}>
          <SheetTitle>Importance</SheetTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {IMPACTS.map((i) => (
              <MChip key={i.id} on={impact === i.id} onClick={() => setImpact(i.id)}>{i.label}</MChip>
            ))}
          </div>

          <SheetTitle>Currencies</SheetTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <MChip on={ccys.length === 0} onClick={() => setCcys([])}>All</MChip>
            <MChip on={majorsOn} onClick={() => setCcys(majorsOn ? [] : MAJORS)}>Majors</MChip>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {currencyOptions.map((c) => (
              <MChip key={c} on={ccys.includes(c)} onClick={() => flip(c)} label={CCY_META[c] ? CCY_META[c].name : c}>
                <Flag ccy={c} w={18} />
                {c}
              </MChip>
            ))}
          </div>

          <SheetTitle>Category</SheetTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <MChip on={cat === "all"} onClick={() => setCat("all")}>All</MChip>
            {categoryOptions.map((c) => (
              <MChip key={c} on={cat === c} onClick={() => setCat(cat === c ? "all" : c)}>{c}</MChip>
            ))}
          </div>

          <SheetTitle>Time zone</SheetTitle>
          <select className="ec-ctl" aria-label="Time zone" value={tzSel} onChange={(e) => pickTz(e.target.value)} style={{ ...fieldBase, width: "100%", minHeight: 46, padding: "0 12px", fontSize: 16 }}>
            <option value="local">Your timezone: {localTz}</option>
            {ZONES.filter(([id]) => id !== localTz).map(([id, name]) => (
              <option key={id} value={id}>{name} ({id})</option>
            ))}
          </select>

          <SheetTitle>Show</SheetTitle>
          <button type="button" role="switch" aria-checked={showHolidays} className="ec-ctl" onClick={toggleHolidays} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", minHeight: 48, padding: "0 14px", borderRadius: 12, border: `1px solid ${palette.border}`, background: tint(palette.text, 4), color: palette.text, fontFamily: sans, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Bank holidays
            <span aria-hidden="true" style={{ position: "relative", width: 42, height: 24, borderRadius: 99, background: showHolidays ? palette.gold : tint(palette.text, 16), transition: "background .15s ease" }}>
              <span style={{ position: "absolute", top: 3, left: showHolidays ? 21 : 3, width: 18, height: 18, borderRadius: 99, background: "#fff", transition: "left .15s ease" }} />
            </span>
          </button>
        </div>
        <div style={{ padding: "12px 18px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${palette.border}` }}>
          <button type="button" className="ec-ctl" onClick={onClose} style={{ width: "100%", minHeight: 48, borderRadius: 14, border: 0, cursor: "pointer", fontFamily: sans, fontSize: 14, fontWeight: 800, background: palette.gold, color: "#0b0b0b" }}>
            Show {count} {count === 1 ? "event" : "events"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EconCalendarTab({ theme = "dark", isDesktop, apiBase, subTab, setSubTab, renderSubNav }) {
  const [rangeSel, setRangeSel] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [impact, setImpactState] = useState(() => loadPref("ec-impact", "medium"));
  const [ccys, setCcysState] = useState(() => loadPref("ec-ccys", []));
  const [localView, setLocalView] = useState("news");
  const view = subTab || localView;
  const setView = (v) => (setSubTab || setLocalView)(v);
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [tzSel, setTzSel] = useState(() => loadPref("ec-tz", "local"));
  const [mode, setMode] = useState("clock");
  const [filtersOpen, setFiltersOpen] = useState(() => loadPref("ec-filters", true));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showHolidays, setShowHolidaysState] = useState(() => loadPref("ec-holidays", true));
  const [openId, setOpenId] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [own, setOwn] = useState({ events: [], history: [], feed: null, updatedAt: 0, status: apiBase ? "loading" : "error", error: apiBase ? "" : "The calendar service address is missing." });

  const setImpact = (v) => {
    setImpactState(v);
    savePref("ec-impact", v);
  };
  const setCcys = (v) => {
    setCcysState(v);
    savePref("ec-ccys", v);
  };
  const pickTz = (v) => {
    setTzSel(v);
    savePref("ec-tz", v);
  };
  const toggleHolidays = () => {
    setShowHolidaysState((v) => {
      savePref("ec-holidays", !v);
      return !v;
    });
  };
  const toggleFilters = () => {
    setFiltersOpen((o) => {
      savePref("ec-filters", !o);
      return !o;
    });
  };

  // Your own calendar: read from your worker's database (/market/calendar). No other source is used.
  const loadOwn = useRef(null);
  loadOwn.current = async () => {
    if (!apiBase) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/market/calendar`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.events)) throw new Error(data.error || "Couldn't load the calendar.");
      let events = data.events;
      // If the worker has no forecasts (the publisher refuses its shared address), try the public feed straight from this browser.
      try {
        events = await fillForecasts(events, data.feed);
      } catch (e) {
        events = data.events;
      }
      setOwn({ events, history: Array.isArray(data.history) ? data.history : [], feed: data.feed && typeof data.feed === "object" ? data.feed : null, updatedAt: Date.now(), status: data.syncing ? "syncing" : "live", error: "" });
    } catch (err) {
      setOwn((o) => ({ ...o, status: o.events.length ? "live" : "error", error: err.message || "Couldn't load the calendar." }));
    } finally {
      setBusy(false);
    }
  };
  const hasPending = own.events.some((e) => e.status === "pending");
  useEffect(() => {
    loadOwn.current();
    // fast while the first sync runs or a release is waiting for its number, relaxed otherwise
    const every = own.status === "syncing" ? 10000 : hasPending ? 15000 : 60000;
    const id = setInterval(() => loadOwn.current(), every);
    return () => clearInterval(id);
  }, [apiBase, own.status === "syncing", hasPending]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const localTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch (e) {
      return "UTC";
    }
  }, []);
  const tz = tzSel === "local" ? localTz : tzSel;

  const all = useMemo(() => own.events.map(normalize).filter(Boolean).sort((a, b) => a.ms - b.ms), [own.events]);
  const days = useMemo(() => all.map((e) => ({ ...e, day: e.holiday && e.dayKey ? e.dayKey : ymd(e.ms, tz) })), [all, tz]);
  const todayS = ymd(now, tz);
  const [from, to] = useMemo(() => {
    const monday = shiftYmd(todayS, -((dowOf(todayS) + 6) % 7));
    if (rangeSel === "yesterday") return [shiftYmd(todayS, -1), shiftYmd(todayS, -1)];
    if (rangeSel === "tomorrow") return [shiftYmd(todayS, 1), shiftYmd(todayS, 1)];
    if (rangeSel === "week") return [monday, shiftYmd(monday, 6)];
    if (rangeSel === "next") return [shiftYmd(monday, 7), shiftYmd(monday, 13)];
    if (rangeSel === "custom") {
      const a = customFrom || todayS;
      const b = customTo || a;
      return a <= b ? [a, b] : [b, a];
    }
    return [todayS, todayS];
  }, [rangeSel, todayS, customFrom, customTo]);
  const inRange = useMemo(() => days.filter((e) => e.day >= from && e.day <= to), [days, from, to]);

  const minImpact = (IMPACTS.find((i) => i.id === impact) || IMPACTS[2]).min;
  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      inRange.filter(
        (e) =>
          (e.holiday ? showHolidays || cat === "Holiday" : e.impact >= minImpact) &&
          (!ccys.length || legsOf(e).some((c) => ccys.includes(c))) &&
          (cat === "all" || e.cat === cat) &&
          (!q || e.title.toLowerCase().includes(q) || e.ccy.toLowerCase().includes(q))
      ),
    [inRange, minImpact, ccys, cat, q, showHolidays]
  );
  const groups = useMemo(() => {
    const out = [];
    filtered.forEach((e) => {
      let g = out[out.length - 1];
      if (!g || g.day !== e.day) {
        g = { day: e.day, items: [] };
        out.push(g);
      }
      g.items.push(e);
    });
    out.forEach((g) => g.items.sort((a, b) => (b.holiday ? 1 : 0) - (a.holiday ? 1 : 0) || a.ms - b.ms));
    return out;
  }, [filtered]);
  const currencyOptions = useMemo(() => {
    const present = [...new Set(all.flatMap(legsOf))].filter((c) => c && c !== "ALL");
    return [...CCY_ORDER, ...present.filter((c) => !CCY_ORDER.includes(c)).sort()];
  }, [all]);
  const categoryOptions = useMemo(() => CATEGORIES.filter((c) => all.some((e) => e.cat === c)), [all]);
  const next = filtered.find((e) => !e.holiday && e.ms > now);

  const reset = () => {
    setCcys([]);
    setCat("all");
    setImpact("medium");
    setSearch("");
  };
  const pickRange = (id) => {
    if (id === "custom" && !customFrom) {
      setCustomFrom(todayS);
      setCustomTo(shiftYmd(todayS, 6));
    }
    setRangeSel(id);
    setOpenId(null);
  };

  const loading = own.status === "loading";
  const failed = own.status === "error" && all.length === 0;
  const syncing = own.status === "syncing" && all.length === 0;
  const open = anySessionOpen(now);
  const clockTime = new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const ccyText = ccys.length === 0 ? `Currencies (${currencyOptions.length})` : ccys.length <= 3 ? ccys.join(", ") : `${ccys.length} currencies`;
  const catText = cat === "all" ? "All Categories" : cat;
  const impText = (IMPACTS.find((i) => i.id === impact) || IMPACTS[2]).label;

  const pill = (on) => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9, border: `1px solid ${on ? tint(palette.gold, 40) : "transparent"}`, cursor: "pointer",
    fontSize: 11.5, fontWeight: 700, fontFamily: sans, whiteSpace: "nowrap", flexShrink: 0, background: on ? tint(palette.gold, 14) : "transparent", color: on ? palette.gold : palette.textMuted,
    transition: "background .15s ease, color .15s ease",
  });

  const list = (() => {
    if (loading && all.length === 0) return <Skeleton />;
    if (syncing) return <Notice>Setting up your calendar for the first time. The official release schedule is being loaded; this takes under a minute.</Notice>;
    if (failed) {
      return (
        <Notice>
          <div style={{ marginBottom: 12 }}>{own.error || "Couldn't load the calendar."}</div>
          <button type="button" onClick={() => loadOwn.current()} style={pill(true)}>Try again</button>
        </Notice>
      );
    }
    if (groups.length === 0) {
      const upcoming = ccys.length > 0 ? all.filter((e) => e.ms > now && legsOf(e).some((c) => ccys.includes(c))).sort((a, b) => a.ms - b.ms)[0] : null;
      return (
        <Notice>
          No events match these filters. Try another date range, lower the importance, or press Reset.
          {upcoming && (
            <div style={{ marginTop: 10, fontSize: 11.5 }}>
              Next scheduled for {ccys.join(", ")}: <b>{upcoming.title}</b> on {longDay(ymd(upcoming.ms, tz))}.
            </div>
          )}
        </Notice>
      );
    }
    return groups.map((g) => {
      const items = g.items;
      return (
        <div key={g.day}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px 8px", ...(isDesktop ? {} : { background: tint(palette.text, 3) }) }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: palette.text }}>{longDay(g.day)}</span>
            {g.day === todayS && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: tint(palette.gold, 18), color: palette.gold }}>Today</span>}
            <span style={{ fontSize: 11, color: palette.textFaint }}>
              {items.length} {items.length === 1 ? "event" : "events"}
            </span>
          </div>
          {items.map((ev) => ev.holiday ? <HolidayRow key={ev.id} ev={ev} compact={!isDesktop} /> : (
            <EventRow
              key={ev.id}
              ev={ev}
              isNext={!!next && ev.id === next.id}
              compact={!isDesktop}
              now={now}
              tz={tz}
              mode={mode}
              open={openId === ev.id}
              onToggle={() => setOpenId(openId === ev.id ? null : ev.id)}
              history={own.history}
            />
          ))}
        </div>
      );
    });
  })();

  /* ---------- mobile feed ---------- */
  const mobileGroups = groups.map((g) => {
    const hi = g.items.filter((e) => !e.holiday && e.impact >= 3).length;
    return (
      <section key={g.day}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderTop: `1px solid ${palette.border}`, background: tint(palette.text, 3) }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: palette.text, letterSpacing: -0.2 }}>{shortDay(g.day)}</span>
          {g.day === todayS && <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: tint(palette.gold, 18), color: palette.gold }}>Today</span>}
          <span style={{ marginLeft: "auto", fontSize: 11, color: palette.textFaint }}>
            {g.items.length} {g.items.length === 1 ? "event" : "events"}
            {hi > 0 ? ` · ${hi} high` : ""}
          </span>
        </div>
        {g.items.map((ev) => ev.holiday ? <MobileHoliday key={ev.id} ev={ev} /> : (
          <MobileEventCard key={ev.id} ev={ev} isNext={!!next && ev.id === next.id} now={now} tz={tz} open={openId === ev.id} onToggle={() => setOpenId(openId === ev.id ? null : ev.id)} history={own.history} />
        ))}
      </section>
    );
  });
  const feedReady = !((loading && all.length === 0) || syncing || failed || groups.length === 0);
  const filterCount = (ccys.length ? 1 : 0) + (cat !== "all" ? 1 : 0) + (tzSel !== "local" ? 1 : 0) + (showHolidays ? 0 : 1);
  const mpill = (on) => ({
    display: "inline-flex", alignItems: "center", minHeight: 40, padding: "0 15px", borderRadius: 99, cursor: "pointer", flexShrink: 0, fontFamily: sans, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
    border: `1px solid ${on ? tint(palette.gold, 55) : palette.border}`, background: on ? tint(palette.gold, 16) : "transparent", color: on ? palette.gold : palette.textMuted,
  });
  const segs = [["all", "All", null], ["medium", "Medium+", AMBER], ["high", "High", palette.red]];
  const mobileNews = (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "4px 2px 12px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4, color: palette.text }}>Economic Calendar</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontSize: 11, color: palette.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Clock size={12} aria-hidden="true" />
            <b style={{ color: palette.text, fontVariantNumeric: "tabular-nums" }}>{clockTime}</b>
            <span>{offsetLabel(now, tz)} · {tzName(tz)}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 11px", borderRadius: 99, border: `1px solid ${palette.border}`, fontSize: 11, fontWeight: 700, color: palette.textMuted }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: open ? GOOD : palette.textFaint, boxShadow: open ? `0 0 0 3px ${tint(GOOD, 25)}` : "none" }} />
            {open ? "Open" : "Closed"}
          </span>
          <button type="button" className="ec-ctl" onClick={() => loadOwn.current()} disabled={busy} aria-label="Refresh calendar" style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 12, border: `1px solid ${palette.border}`, background: "transparent", color: palette.textMuted, cursor: busy ? "default" : "pointer" }}>
            <RefreshCw size={15} className={busy ? "ec-spin" : undefined} />
          </button>
        </div>
      </div>

      <div style={{ border: `1px solid ${palette.border}`, borderRadius: 16, overflow: "hidden", background: palette.surface }}>
      <div style={{ padding: 12 }}>
      <div className="ec-pills" role="tablist" aria-label="Date range" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -12px", padding: "0 12px 12px" }}>
        {RANGES.map((r) => (
          <button key={r.id} type="button" role="tab" aria-selected={rangeSel === r.id} onClick={() => pickRange(r.id)} style={mpill(rangeSel === r.id)}>{r.label}</button>
        ))}
      </div>

      {rangeSel === "custom" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 12 }}>
          <input type="date" className="ec-ctl" aria-label="From date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ ...fieldBase, flex: 1, minHeight: 44, fontSize: 16 }} />
          <span style={{ color: palette.textFaint, fontSize: 11 }}>to</span>
          <input type="date" className="ec-ctl" aria-label="To date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ ...fieldBase, flex: 1, minHeight: 44, fontSize: 16 }} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, paddingBottom: 10 }}>
        <label style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: palette.textFaint }} />
          <input className="ec-ctl" aria-label="Find an event" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search CPI, NFP, Fed, EUR..." style={{ ...fieldBase, width: "100%", minHeight: 44, padding: "0 12px 0 38px", fontSize: 16, borderRadius: 14 }} />
        </label>
        <button type="button" className="ec-ctl" aria-label={`Filters${filterCount ? `, ${filterCount} active` : ""}`} onClick={() => setSheetOpen(true)} style={{ position: "relative", display: "grid", placeItems: "center", width: 44, height: 44, flexShrink: 0, borderRadius: 14, cursor: "pointer", border: `1px solid ${filterCount ? tint(palette.gold, 55) : palette.border}`, background: filterCount ? tint(palette.gold, 14) : tint(palette.text, 4), color: filterCount ? palette.gold : palette.textMuted }}>
          <SlidersHorizontal size={17} />
          {filterCount > 0 && <span style={{ position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 99, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, background: palette.gold, color: "#0b0b0b" }}>{filterCount}</span>}
        </button>
      </div>

      <div role="radiogroup" aria-label="Importance" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4, padding: 4, borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.field || tint(palette.text, 4) }}>
        {segs.map(([id, label, dot]) => {
          const on = impact === id;
          return (
            <button key={id} type="button" role="radio" aria-checked={on} className="ec-ctl" onClick={() => setImpact(id)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 38, border: 0, borderRadius: 10, cursor: "pointer", fontFamily: sans, fontSize: 12, fontWeight: 800, background: on ? tint(dot || palette.text, dot ? 20 : 12) : "transparent", color: on ? palette.text : palette.textFaint }}>
              {dot && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: dot }} />}
              {label}
            </button>
          );
        })}
      </div>

      {(ccys.length > 0 || cat !== "all") && (
        <div className="ec-pills" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "10px -12px 0", padding: "0 12px" }}>
          {ccys.map((c) => (
            <MChip key={c} on onClick={() => setCcys(ccys.filter((x) => x !== c))} label={`Remove ${c}`}>
              <Flag ccy={c} w={16} />
              {c}
              <X size={13} aria-hidden="true" />
            </MChip>
          ))}
          {cat !== "all" && (
            <MChip on onClick={() => setCat("all")} label={`Remove ${cat}`}>
              {cat}
              <X size={13} aria-hidden="true" />
            </MChip>
          )}
        </div>
      )}

      </div>
      {feedReady && next && <div style={{ padding: "0 12px 12px" }}><NextUpCard ev={next} now={now} tz={tz} onOpen={() => setOpenId(next.id)} /></div>}

      <div style={{ minHeight: 120 }}>
        {feedReady ? mobileGroups : <div style={{ borderTop: `1px solid ${palette.border}` }}>{list}</div>}
      </div>
      </div>

      <div style={{ padding: "10px 6px 6px", textAlign: "center", fontSize: 10.5, lineHeight: 1.6, color: palette.textFaint }}>
        {filtered.length} of {inRange.length} events{own.updatedAt ? ` · ${updatedText(own.updatedAt, now)}` : ""}
        <br />
        Official data where available · forecasts from a public consensus feed
        {own.feed && own.feed.ok === false && <b style={{ display: "block", color: AMBER, fontWeight: 700 }}>Forecasts are unavailable right now. They return on their own.</b>}
        {own.feed && own.feed.ok && own.feed.stale && <span style={{ display: "block" }}>Forecasts are from a saved copy.</span>}
        {!own.feed && own.status === "live" && own.events.length > 0 && <b style={{ display: "block", color: AMBER, fontWeight: 700 }}>Forecasts haven't loaded yet.</b>}
      </div>

      {sheetOpen && (
        <FilterSheet
          onClose={() => setSheetOpen(false)}
          {...{ impact, setImpact, ccys, setCcys, currencyOptions, cat, setCat, categoryOptions, tzSel, pickTz, localTz, showHolidays, toggleHolidays, reset }}
          count={filtered.length}
        />
      )}
    </div>
  );

  return (
    <div style={{ padding: isDesktop ? 0 : "0 12px" }}>
      <style>{`.ec-row:hover{background:${tint(palette.text, 4)}}
.ec-row:focus-visible,.ec-pills button:focus-visible,.ec-ctl:focus-visible,.ec-opt:focus-visible{outline:2px solid ${palette.gold};outline-offset:1px}
.ec-opt:hover{background:${tint(palette.text, 6)}}
.ec-pills{scrollbar-width:none}.ec-pills::-webkit-scrollbar{display:none}
@keyframes ec-spin{to{transform:rotate(360deg)}}
.ec-spin{animation:ec-spin .9s linear infinite}
@media (prefers-reduced-motion: reduce){.ec-pills button{transition:none!important}.ec-spin{animation:none}.ec-sheet,.ec-fade{animation:none!important}}
@keyframes ec-up{from{transform:translateY(100%)}to{transform:none}}
@keyframes ec-in{from{opacity:0}to{opacity:1}}
.ec-sheet{animation:ec-up .26s cubic-bezier(.22,1,.36,1)}.ec-fade{animation:ec-in .2s ease}`}</style>
      {renderSubNav ? renderSubNav([{ id: "news", label: "News" }, { id: "sessions", label: "Sessions" }], view, setView) : (
        <div role="tablist" style={{ display: "flex", gap: 4, paddingBottom: 12 }}>
          {[["news", "News"], ["sessions", "Sessions"]].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} style={pill(view === id)}>{label}</button>
          ))}
        </div>
      )}
      {view === "sessions" ? <SessionsView now={now} tz={tz} isDesktop={isDesktop} events={all} /> : !isDesktop ? mobileNews : (
      <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: 18, overflow: "hidden", boxShadow: palette.shadow }}>
        {/* page header */}
        {view !== "sessions" && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 18px 12px" }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: palette.text }}>Economic Calendar</div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 99, border: `1px solid ${palette.border}`, fontSize: 11, fontWeight: 700, color: palette.textMuted }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: open ? palette.gold : palette.textFaint }} />
            {open ? "Market open" : "Market closed"}
          </span>
        </div>}

        {view === "sessions" ? <div style={{ paddingTop: 16 }}><SessionsView now={now} tz={tz} isDesktop={isDesktop} events={all} /></div> : (<>
        {/* date tabs + filter toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 18px 12px" }}>
          <div className="ec-pills" role="tablist" aria-label="Date range" style={{ display: "flex", gap: 2, overflowX: "auto", flex: 1, minWidth: 0 }}>
            {RANGES.map((r) => (
              <button key={r.id} type="button" role="tab" aria-selected={rangeSel === r.id} onClick={() => pickRange(r.id)} style={pill(rangeSel === r.id)}>
                {r.label}
              </button>
            ))}
          </div>
          <button type="button" className="ec-ctl" aria-pressed={impact === "high"} onClick={() => setImpact(impact === "high" ? "medium" : "high")} style={{ ...fieldBase, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontWeight: 700, flexShrink: 0, borderColor: impact === "high" ? "#ef4444" : palette.border, color: impact === "high" ? "#ef4444" : palette.textMuted, background: impact === "high" ? tint("#ef4444", 12) : fieldBase.background }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: "#ef4444" }} />
            {isDesktop ? "High impact only" : "High"}
          </button>
          <button type="button" className="ec-ctl" aria-expanded={filtersOpen} onClick={toggleFilters} style={{ ...fieldBase, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontWeight: 700, flexShrink: 0, borderColor: tint(palette.gold, 40), color: palette.gold }}>
            <SlidersHorizontal size={14} />
            {isDesktop ? (filtersOpen ? "Hide Filters" : "Show Filters") : null}
          </button>
        </div>

        {rangeSel === "custom" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "0 18px 12px" }}>
            <input type="date" className="ec-ctl" aria-label="From date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={fieldBase} />
            <span style={{ color: palette.textFaint, fontSize: 11 }}>to</span>
            <input type="date" className="ec-ctl" aria-label="To date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={fieldBase} />
          </div>
        )}

        {filtersOpen && (
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, minmax(0, 1fr))" : "1fr", gap: 12, padding: "0 18px 14px" }}>
            <Dropdown label="Country" text={ccyText}>
              {() => (
                <>
                  <Option on={ccys.length === 0} onClick={() => setCcys([])}>All currencies</Option>
                  {currencyOptions.map((c) => (
                    <Option key={c} on={ccys.includes(c)} onClick={() => setCcys(ccys.includes(c) ? ccys.filter((x) => x !== c) : [...ccys, c])}>
                      <Flag ccy={c} w={20} />
                      <span style={{ fontWeight: 800 }}>{c}</span>
                      <span style={{ color: palette.textFaint, fontWeight: 600 }}>{CCY_META[c] ? CCY_META[c].name : ""}</span>
                    </Option>
                  ))}
                </>
              )}
            </Dropdown>
            <Dropdown label="Category" text={catText}>
              {(close) => (
                <>
                  <Option on={cat === "all"} onClick={() => { setCat("all"); close(); }}>All Categories</Option>
                  {categoryOptions.map((c) => (
                    <Option key={c} on={cat === c} onClick={() => { setCat(c); close(); }}>{c}</Option>
                  ))}
                </>
              )}
            </Dropdown>
            <Dropdown label="Importance" text={impText}>
              {(close) => IMPACTS.map((i) => (
                <Option key={i.id} on={impact === i.id} onClick={() => { setImpact(i.id); close(); }}>{i.label}</Option>
              ))}
            </Dropdown>
          </div>
        )}

        {/* time zone, clock mode, search */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "0 18px 14px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11.5, color: palette.textMuted, whiteSpace: "nowrap" }}>
            <Clock size={13} aria-hidden="true" />
            Current time <b style={{ color: palette.text, fontVariantNumeric: "tabular-nums" }}>{clockTime}</b>
            <span style={{ color: palette.textFaint }}>({offsetLabel(now, tz)})</span>
          </span>
          <select className="ec-ctl" aria-label="Time zone" value={tzSel} onChange={(e) => pickTz(e.target.value)} style={{ ...fieldBase, padding: "6px 9px", fontSize: 11.5, maxWidth: "100%" }}>
            <option value="local">Your timezone — {localTz}</option>
            {ZONES.filter(([id]) => id !== localTz).map(([id, name]) => (
              <option key={id} value={id}>{name} — {id}</option>
            ))}
          </select>
          <div role="radiogroup" aria-label="Time display" style={{ display: "inline-flex", border: `1px solid ${palette.border}`, borderRadius: 9, overflow: "hidden" }}>
            {[["clock", "Clock"], ["countdown", "Countdown"]].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={mode === id} className="ec-ctl" onClick={() => setMode(id)} style={{ padding: "6px 11px", border: 0, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: sans, background: mode === id ? tint(palette.text, 10) : "transparent", color: mode === id ? palette.text : palette.textFaint }}>
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showHolidays}
            className="ec-ctl"
            onClick={toggleHolidays}
            style={{ ...fieldBase, display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: showHolidays ? palette.gold : palette.textFaint, borderColor: showHolidays ? tint(palette.gold, 40) : palette.border }}
          >
            <span style={{ display: "grid", placeItems: "center", width: 15, height: 15, borderRadius: 4, border: `1px solid ${showHolidays ? palette.gold : palette.border}`, background: showHolidays ? tint(palette.gold, 20) : "transparent" }}>
              {showHolidays && <Check size={11} />}
            </span>
            Holidays
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 260px", justifyContent: isDesktop ? "flex-end" : "flex-start", flexWrap: "wrap" }}>
            <label style={{ position: "relative", flex: "1 1 180px", maxWidth: 280, minWidth: 150 }}>
              <Search size={14} aria-hidden="true" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: palette.textFaint }} />
              <input className="ec-ctl" aria-label="Find an event" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an event..." style={{ ...fieldBase, width: "100%", padding: "7px 10px 7px 30px", fontSize: 11.5 }} />
            </label>
            <span style={{ fontSize: 11, color: palette.textMuted, whiteSpace: "nowrap" }}>
              Showing <b style={{ color: palette.text }}>{filtered.length}</b> of {inRange.length}
            </span>
            <button type="button" className="ec-ctl" onClick={reset} style={{ border: 0, background: "transparent", color: palette.gold, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: sans }}>
              Reset
            </button>
          </div>
        </div>

        {/* table */}
        {isDesktop && !failed && !syncing && (
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, padding: "9px 18px", fontSize: 10.5, color: palette.textFaint, fontWeight: 700, ...hairline }}>
            <span>Time</span>
            <span>Cur.</span>
            <span>Event</span>
            <span>Imp.</span>
            <span style={{ textAlign: "right" }}>Actual</span>
            <span style={{ textAlign: "right" }}>Forecast</span>
            <span style={{ textAlign: "right" }}>Previous</span>
          </div>
        )}
        <div style={{ ...hairline, minHeight: 120, paddingBottom: 4 }}>{list}</div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "10px 18px", fontSize: 10.5, color: palette.textFaint, ...hairline }}>
          <span>
            Source: your own calendar · official data where available · forecasts from a public consensus feed{own.updatedAt ? ` · ${updatedText(own.updatedAt, now)}` : ""}
            {own.feed && own.feed.ok === false && (
              <b style={{ color: AMBER, fontWeight: 700 }}> · Forecasts are unavailable right now (the provider is limiting requests). They return on their own.</b>
            )}
            {own.feed && own.feed.ok && own.feed.stale && <span> · Forecasts are from a saved copy (provider is limiting requests)</span>}
            {!own.feed && own.status === "live" && own.events.length > 0 && (
              <b style={{ color: AMBER, fontWeight: 700 }}> · Forecasts haven't loaded yet. If this stays, open your worker's /market/calendar/health to see why.</b>
            )}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            Times in {tz} · {filtered.length} {filtered.length === 1 ? "event" : "events"}
            <button type="button" className="ec-ctl" onClick={() => loadOwn.current()} disabled={busy} aria-label="Refresh calendar" title="Refresh calendar" style={{ display: "grid", placeItems: "center", width: 24, height: 24, border: 0, background: "transparent", color: palette.textMuted, cursor: busy ? "default" : "pointer" }}>
              <RefreshCw size={13} className={busy ? "ec-spin" : undefined} />
            </button>
          </span>
        </div>
        </>)}
      </div>
      )}
    </div>
  );
}
