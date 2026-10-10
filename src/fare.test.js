import assert from "node:assert/strict";
import test from "node:test";
import {
  STATIONS,
  coachFor,
  departureBoard,
  faresForKm,
  kilometers,
  money,
  quote,
} from "./fare.js";

test("adult fare is boarding plus mileage, child fare is half", () => {
  assert.deepEqual(faresForKm(278), { adult: 32, child: 16 });
  assert.deepEqual(faresForKm(140), { adult: 20, child: 10 });
  assert.deepEqual(faresForKm(294), { adult: 33, child: 17 });
  assert.deepEqual(faresForKm(10), { adult: 18, child: 9 });
});

test("quote multiplies fares and refuses a station paired with itself", () => {
  const sale = quote({ from: "SEA", to: "PDX", adults: 2, children: 1 });
  assert.equal(sale.km, 278);
  assert.equal(sale.adultTotal, 64);
  assert.equal(sale.childTotal, 16);
  assert.equal(sale.total, 80);
  assert.equal(quote({ from: "SEA", to: "SEA", adults: 1, children: 0 }), null);
  assert.equal(quote({ from: "SEA", to: "NOPE", adults: 1, children: 0 }), null);
});

test("passenger counts clamp to the keypad range", () => {
  const sale = quote({ from: "SFO", to: "SAC", adults: 12.8, children: -4 });
  assert.equal(sale.adult, 20);
  assert.equal(sale.adultCount, 9);
  assert.equal(sale.childCount, 0);
  assert.equal(sale.total, 180);
});

test("every station pair has one symmetric distance", () => {
  for (const origin of STATIONS) {
    for (const destination of STATIONS) {
      if (origin.code === destination.code) {
        assert.equal(kilometers(origin.code, destination.code), null);
      } else {
        const km = kilometers(origin.code, destination.code);
        assert.equal(typeof km, "number");
        assert.ok(km > 0);
        assert.equal(kilometers(destination.code, origin.code), km);
      }
    }
  }
});

test("a route has four stable departures and one coach", () => {
  const times = departureBoard("LAX", "SAN");
  assert.equal(times.length, 4);
  const minutes = times.map((clock) => {
    const [hours, mins] = clock.split(":").map(Number);
    return hours * 60 + mins;
  });
  assert.deepEqual([...minutes].sort((a, b) => a - b), minutes);
  for (const minute of minutes) {
    assert.ok(minute >= 6 * 60 && minute <= 20 * 60);
    assert.equal(minute % 5, 0);
  }
  assert.deepEqual(departureBoard("SAN", "LAX"), times);
  assert.equal(coachFor("LAX", "SAN"), coachFor("SAN", "LAX"));
  assert.ok(coachFor("LAX", "SAN") >= 1 && coachFor("LAX", "SAN") <= 18);
  assert.equal(departureBoard("SEA", "SEA").length, 0);
});

test("money formats whole dollars", () => {
  assert.equal(money(32), "$32.00");
  assert.equal(money(0), "$0.00");
});
