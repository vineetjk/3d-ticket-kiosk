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
  assert.deepEqual(faresForKm(3), { adult: 18, child: 9 });
  assert.deepEqual(faresForKm(22), { adult: 65, child: 33 });
  assert.deepEqual(faresForKm(1), { adult: 15, child: 8 });
});

test("quote multiplies fares and refuses a station paired with itself", () => {
  const sale = quote({ from: "MJS", to: "WFD", adults: 2, children: 1 });
  assert.equal(sale.km, 22);
  assert.equal(sale.adultTotal, 130);
  assert.equal(sale.childTotal, 33);
  assert.equal(sale.total, 163);
  assert.equal(quote({ from: "MJS", to: "MJS", adults: 1, children: 0 }), null);
  assert.equal(quote({ from: "MJS", to: "NOPE", adults: 1, children: 0 }), null);
});

test("passenger counts clamp to the keypad range", () => {
  const sale = quote({ from: "MJS", to: "YPR", adults: 12.8, children: -4 });
  assert.equal(sale.adult, 25);
  assert.equal(sale.adultCount, 9);
  assert.equal(sale.childCount, 0);
  assert.equal(sale.total, 225);
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
  const times = departureBoard("MJS", "JYN");
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
  assert.deepEqual(departureBoard("JYN", "MJS"), times);
  assert.equal(coachFor("MJS", "JYN"), coachFor("JYN", "MJS"));
  assert.ok(coachFor("MJS", "JYN") >= 1 && coachFor("MJS", "JYN") <= 18);
  assert.equal(departureBoard("MJS", "MJS").length, 0);
});

test("money formats rupees", () => {
  assert.equal(money(32), "₹32");
  assert.equal(money(0), "₹0");
});
