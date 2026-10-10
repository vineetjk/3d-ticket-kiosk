/** Coach fare rules for the Halyard ticket terminal. */

export const STATIONS = [
  { code: "SEA", name: "Seattle" },
  { code: "PDX", name: "Portland" },
  { code: "SFO", name: "San Francisco" },
  { code: "SAC", name: "Sacramento" },
  { code: "LAX", name: "Los Angeles" },
  { code: "SAN", name: "San Diego" },
  { code: "LAS", name: "Las Vegas" },
  { code: "PHX", name: "Phoenix" },
];

/** Road kilometres between station codes. Keys are sorted pairs. */
const KILOMETERS = {
  "LAS-LAX": 435,
  "LAS-PDX": 1540,
  "LAS-PHX": 478,
  "LAS-SAC": 790,
  "LAS-SAN": 520,
  "LAS-SEA": 1744,
  "LAS-SFO": 920,
  "LAX-PDX": 1536,
  "LAX-PHX": 598,
  "LAX-SAC": 616,
  "LAX-SAN": 194,
  "LAX-SEA": 1829,
  "LAX-SFO": 615,
  "PDX-PHX": 2090,
  "PDX-SAC": 924,
  "PDX-SAN": 1720,
  "PDX-SEA": 278,
  "PDX-SFO": 1016,
  "PHX-SAC": 1190,
  "PHX-SAN": 568,
  "PHX-SEA": 2290,
  "PHX-SFO": 1205,
  "SAC-SAN": 840,
  "SAC-SEA": 1210,
  "SAC-SFO": 140,
  "SAN-SEA": 2014,
  "SAN-SFO": 808,
  "SEA-SFO": 1296,
};

const MINUTES_OPEN = 6 * 60;
const MINUTES_CLOSE = 20 * 60;

export function stationByCode(code) {
  return STATIONS.find((station) => station.code === code) ?? null;
}

export function pairKey(from, to) {
  return [from, to].sort().join("-");
}

export function kilometers(from, to) {
  if (!from || !to || from === to) return null;
  return KILOMETERS[pairKey(from, to)] ?? null;
}

/**
 * Adult fare is $8 boarding plus 8.5¢ per kilometre, rounded to the
 * nearest dollar, with an $18 floor. A child ticket is half of that,
 * rounded to the nearest dollar.
 */
export function faresForKm(km) {
  const cents = 800 + Math.round((km * 85) / 10);
  const adult = Math.max(18, Math.round(cents / 100));
  const child = Math.round(adult / 2);
  return { adult, child };
}

function clampCount(value) {
  const n = Number.isFinite(value) ? Math.trunc(value) : 0;
  return Math.min(9, Math.max(0, n));
}

export function quote({ from, to, adults = 0, children = 0 }) {
  const km = kilometers(from, to);
  if (km == null) return null;
  const { adult, child } = faresForKm(km);
  const adultCount = clampCount(adults);
  const childCount = clampCount(children);
  const adultTotal = adult * adultCount;
  const childTotal = child * childCount;
  return {
    km,
    adult,
    child,
    adultCount,
    childCount,
    adultTotal,
    childTotal,
    total: adultTotal + childTotal,
    coach: coachFor(from, to),
  };
}

export function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function formatClock(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function coachFor(from, to) {
  if (kilometers(from, to) == null) return null;
  return (hash(pairKey(from, to)) % 18) + 1;
}

/** Four stable departure clocks between 06:00 and 20:00 for a route. */
export function departureBoard(from, to) {
  if (kilometers(from, to) == null) return [];
  let n = hash(pairKey(from, to));
  const found = new Set();
  let guard = 0;
  while (found.size < 4 && guard < 40) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    let minute = MINUTES_OPEN + (n % (MINUTES_CLOSE - MINUTES_OPEN));
    minute = Math.round(minute / 5) * 5;
    if (minute > MINUTES_CLOSE) minute = MINUTES_CLOSE;
    if (minute < MINUTES_OPEN) minute = MINUTES_OPEN;
    found.add(minute);
    guard += 1;
  }
  return [...found].sort((a, b) => a - b).map(formatClock);
}

export function money(amount) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function formatTicketDate(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTicketTime(date) {
  return formatClock(date.getHours() * 60 + date.getMinutes());
}
