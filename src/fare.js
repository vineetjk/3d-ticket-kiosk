/** Fare rules for the BMTC ticket terminal at Majestic. */

export const STATIONS = [
  { code: "MJS", name: "Majestic" },
  { code: "SVJ", name: "Shivajinagar" },
  { code: "JYN", name: "Jayanagar" },
  { code: "BSK", name: "Banashankari" },
  { code: "HBL", name: "Hebbal" },
  { code: "WFD", name: "Whitefield" },
  { code: "ELC", name: "Electronic City" },
  { code: "YPR", name: "Yeshwanthpur" },
];

/** Approximate road kilometres between BMTC points. Keys are sorted pairs. */
const KILOMETERS = {
  "BSK-ELC": 12,
  "BSK-HBL": 17,
  "BSK-JYN": 4,
  "BSK-MJS": 9,
  "BSK-SVJ": 12,
  "BSK-WFD": 24,
  "BSK-YPR": 13,
  "ELC-HBL": 27,
  "ELC-JYN": 14,
  "ELC-MJS": 18,
  "ELC-SVJ": 20,
  "ELC-WFD": 28,
  "ELC-YPR": 24,
  "HBL-JYN": 16,
  "HBL-MJS": 10,
  "HBL-SVJ": 9,
  "HBL-WFD": 18,
  "HBL-YPR": 8,
  "JYN-MJS": 8,
  "JYN-SVJ": 10,
  "JYN-WFD": 20,
  "JYN-YPR": 12,
  "MJS-SVJ": 3,
  "MJS-WFD": 22,
  "MJS-YPR": 6,
  "SVJ-WFD": 20,
  "SVJ-YPR": 8,
  "WFD-YPR": 22,
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
 * Adult fare is ₹10 boarding plus ₹2.50 per kilometre, rounded to the
 * rupee, and never below ₹15. A child ticket is half of that, rounded
 * to the rupee.
 */
export function faresForKm(km) {
  const paise = 1000 + km * 250;
  const adult = Math.max(15, Math.round(paise / 100));
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
  return `₹${amount.toLocaleString("en-IN")}`;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function formatTicketDate(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTicketTime(date) {
  return formatClock(date.getHours() * 60 + date.getMinutes());
}
