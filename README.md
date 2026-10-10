# Halyard coach ticket terminal

A countertop ticket window for Halyard coaches. Pick an origin, a destination, and how many adults and children are traveling. The terminal prices the slip, then ejects it onto the counter in front of the machine.

The page is plain HTML, CSS, and JavaScript. Vite only serves it.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
```

## Selling a ticket

1. Tap **Origin** and a station, then **Destination** and a different station.
2. Choose today or tomorrow and a departure. The first coach of the day is already selected.
3. Set adults and children. Children are half the adult fare, rounded to the dollar.
4. Press **Issue ticket** on the screen or the brass **Issue** key. The slip feeds out of the slot.
5. **Feed** reprints the slip already at the window. **Clear** retracts it and resets the sale.

Issuing again on the same route prints a new slip with a new number. Changing the route or the counts after a sale leaves the old slip in place until you issue or clear.

## Fare

Adult fare is $8 boarding plus 8.5¢ per kilometre, rounded to the nearest dollar, and never below $18. A child pays half of the adult fare, rounded to the nearest dollar. The amount due is adults times the adult fare, plus children times the child fare.

Distances are fixed road kilometres between Seattle, Portland, San Francisco, Sacramento, Los Angeles, San Diego, Las Vegas, and Phoenix. The same pair always gets the same coach number and the same four departure times.
