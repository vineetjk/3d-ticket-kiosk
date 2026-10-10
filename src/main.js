import {
  STATIONS,
  departureBoard,
  formatTicketDate,
  formatTicketTime,
  hash,
  money,
  quote,
  stationByCode,
} from "./fare.js";

const MAX_PASSENGERS = 9;

const state = {
  from: null,
  to: null,
  picking: "from",
  adults: 0,
  children: 0,
  when: "today",
  departure: null,
  error: "",
  busy: false,
  ticket: null,
  ticketOut: false,
};

const el = {
  machine: document.querySelector("#machine"),
  counter: document.querySelector("#counter"),
  scaler: document.querySelector("#scaler"),
  fit: document.querySelector("#fit"),
  clock: document.querySelector("#clock"),
  status: document.querySelector("#status"),
  lampFeed: document.querySelector("#lamp-feed"),
  plaqueFrom: document.querySelector("#plaque-from"),
  plaqueTo: document.querySelector("#plaque-to"),
  modeFrom: document.querySelector("#mode-from"),
  modeTo: document.querySelector("#mode-to"),
  stations: document.querySelector("#stations"),
  times: document.querySelector("#times"),
  dayToday: document.querySelector("#day-today"),
  dayTomorrow: document.querySelector("#day-tomorrow"),
  adultsCount: document.querySelector("#adults-count"),
  childrenCount: document.querySelector("#children-count"),
  adultsDec: document.querySelector("#adults-dec"),
  adultsInc: document.querySelector("#adults-inc"),
  childrenDec: document.querySelector("#children-dec"),
  childrenInc: document.querySelector("#children-inc"),
  fare: document.querySelector("#fare"),
  fareKicker: document.querySelector("#fare-kicker"),
  fareLines: document.querySelector("#fare-lines"),
  fareHint: document.querySelector("#fare-hint"),
  fareError: document.querySelector("#fare-error"),
  totalLabel: document.querySelector("#total-label"),
  total: document.querySelector("#total"),
  issue: document.querySelector("#issue"),
  issueHard: document.querySelector("#issue-hard"),
  clear: document.querySelector("#clear"),
  feed: document.querySelector("#feed"),
  led: document.querySelector("#led"),
  landing: document.querySelector("#landing"),
  ticket: document.querySelector("#ticket"),
};

function motionOK() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function currentQuote() {
  return quote({
    from: state.from,
    to: state.to,
    adults: state.adults,
    children: state.children,
  });
}

function slipMatches() {
  const ticket = state.ticket;
  if (!ticket) return false;
  return (
    ticket.fromCode === state.from &&
    ticket.toCode === state.to &&
    ticket.adultCount === state.adults &&
    ticket.childCount === state.children &&
    ticket.when === state.when &&
    ticket.departure === state.departure
  );
}

function phase() {
  if (state.busy) return "printing";
  if (state.error) return "check";
  if (slipMatches()) return "issued";
  return "ready";
}

function armed() {
  const priced = currentQuote();
  return Boolean(
    priced &&
      state.departure &&
      priced.adultCount + priced.childCount > 0 &&
      !state.busy,
  );
}

function travelDate(now = new Date()) {
  const date = new Date(now);
  if (state.when === "tomorrow") date.setDate(date.getDate() + 1);
  return date;
}

function syncBoard() {
  const board =
    state.from && state.to ? departureBoard(state.from, state.to) : [];
  if (!board.includes(state.departure)) state.departure = board[0] ?? null;
  return board;
}

function paintPlaque(node, code, picking) {
  const station = stationByCode(code);
  node.classList.toggle("is-picking", picking);
  node.querySelector("strong").textContent = station ? station.code : "—";
  node.querySelector("em").textContent = station ? station.name : "Select a station";
  node.classList.toggle("is-empty", !station);
  node.setAttribute("aria-pressed", picking ? "true" : "false");
}

function fareLine(label, detail, amount) {
  return `<div class="fare-line"><span>${label}</span><span>${detail}</span><span>${amount}</span></div>`;
}

function renderTimes(board) {
  const signature = board.join(",");
  if (el.times.dataset.board !== signature) {
    el.times.dataset.board = signature;
    if (board.length === 0) {
      el.times.innerHTML = `<p class="times-empty">Times appear once the route is set.</p>`;
    } else {
      el.times.innerHTML = board
        .map(
          (time) =>
            `<button type="button" class="time" data-time="${time}">${time}</button>`,
        )
        .join("");
    }
  }
  for (const button of el.times.querySelectorAll(".time")) {
    const on = button.dataset.time === state.departure;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", on ? "true" : "false");
    button.disabled = state.busy;
  }
}

function renderTicketShell() {
  const ticket = state.ticket;
  const nextId = ticket?.id ?? "";
  if (el.ticket.dataset.id !== nextId) {
    el.ticket.dataset.id = nextId;
    el.ticket.innerHTML = ticket ? ticketMarkup(ticket) : "";
  }
  el.ticket.classList.toggle("is-out", state.ticketOut);
  el.ticket.setAttribute("aria-hidden", state.ticketOut ? "false" : "true");
  el.landing.classList.toggle("is-holding", state.ticketOut || state.busy);
}

function render() {
  const priced = currentQuote();
  const board = syncBoard();
  const nowPhase = phase();
  const canSell = armed();
  const saleReady = Boolean(
    priced && state.departure && priced.adultCount + priced.childCount > 0,
  );

  el.machine.dataset.phase = nowPhase;
  el.machine.classList.toggle("is-printing", state.busy);
  el.status.dataset.phase = nowPhase;
  el.status.textContent = nowPhase.toUpperCase();
  el.lampFeed.classList.toggle("is-hot", state.busy);
  el.lampFeed.classList.toggle("is-on", !state.busy && state.ticketOut);

  paintPlaque(el.plaqueFrom, state.from, state.picking === "from");
  paintPlaque(el.plaqueTo, state.to, state.picking === "to");
  el.modeFrom.classList.toggle("is-active", state.picking === "from");
  el.modeTo.classList.toggle("is-active", state.picking === "to");
  el.modeFrom.setAttribute("aria-selected", state.picking === "from" ? "true" : "false");
  el.modeTo.setAttribute("aria-selected", state.picking === "to" ? "true" : "false");
  el.stations.setAttribute(
    "aria-label",
    state.picking === "from" ? "Stations, choosing origin" : "Stations, choosing destination",
  );

  for (const button of el.stations.querySelectorAll(".station")) {
    const code = button.dataset.code;
    button.classList.toggle("is-from", code === state.from);
    button.classList.toggle("is-to", code === state.to);
    button.setAttribute("aria-pressed", code === state.from || code === state.to ? "true" : "false");
    button.disabled = state.busy;
  }

  el.dayToday.classList.toggle("is-on", state.when === "today");
  el.dayTomorrow.classList.toggle("is-on", state.when === "tomorrow");
  el.dayToday.setAttribute("aria-pressed", state.when === "today" ? "true" : "false");
  el.dayTomorrow.setAttribute("aria-pressed", state.when === "tomorrow" ? "true" : "false");
  el.dayToday.disabled = state.busy;
  el.dayTomorrow.disabled = state.busy;

  renderTimes(board);

  el.adultsCount.textContent = String(state.adults);
  el.childrenCount.textContent = String(state.children);
  el.adultsDec.disabled = state.busy || state.adults <= 0;
  el.adultsInc.disabled = state.busy || state.adults >= MAX_PASSENGERS;
  el.childrenDec.disabled = state.busy || state.children <= 0;
  el.childrenInc.disabled = state.busy || state.children >= MAX_PASSENGERS;

  if (!priced) {
    el.fareKicker.textContent = "Set a route";
    el.fareLines.innerHTML = "";
    el.fareHint.textContent = "Origin, destination, then adults and children.";
    el.total.textContent = "—";
    el.led.textContent = "——";
    el.led.classList.add("is-idle");
  } else {
    const when = travelDate();
    el.fareKicker.textContent = `${formatTicketDate(when)} · ${state.departure} · ${priced.km} km · coach ${String(priced.coach).padStart(2, "0")}`;
    el.fareLines.innerHTML = [
      fareLine("Adult", `${priced.adultCount} × ${money(priced.adult)}`, money(priced.adultTotal)),
      fareLine("Child", `${priced.childCount} × ${money(priced.child)}`, money(priced.childTotal)),
    ].join("");
    const passengers = priced.adultCount + priced.childCount;
    el.fareHint.textContent =
      passengers === 0 ? "Add at least one adult or child." : "";
    el.total.textContent = money(priced.total);
    el.led.textContent = priced.total.toFixed(2);
    el.led.classList.toggle("is-idle", passengers === 0);
  }

  el.fareHint.hidden = el.fareHint.textContent === "";
  el.fareError.textContent = state.error;
  el.fareError.hidden = state.error === "";
  el.totalLabel.textContent = nowPhase === "issued" ? "Paid" : "Amount due";

  for (const button of [el.issue, el.issueHard]) {
    button.classList.toggle("is-cold", !saleReady);
    button.setAttribute("aria-disabled", canSell ? "false" : "true");
    button.disabled = state.busy;
  }
  el.issue.textContent = state.busy ? "Printing" : "Issue ticket";
  el.clear.disabled = state.busy;
  el.feed.disabled = state.busy || !state.ticket;
  el.plaqueFrom.disabled = state.busy;
  el.plaqueTo.disabled = state.busy;
  el.modeFrom.disabled = state.busy;
  el.modeTo.disabled = state.busy;

  renderTicketShell();
}

function chooseStation(code) {
  if (state.busy) return;
  const field = state.picking === "from" ? "from" : "to";
  const other = field === "from" ? "to" : "from";
  if (state[field] === code) {
    state[field] = null;
    state.error = "";
    render();
    return;
  }
  if (state[other] === code) {
    state.error = "Choose a different station.";
    shake();
    render();
    return;
  }
  state[field] = code;
  state.error = "";
  if (field === "from" && !state.to) state.picking = "to";
  render();
}

function step(kind, direction) {
  if (state.busy) return;
  const next = state[kind] + direction;
  if (next < 0 || next > MAX_PASSENGERS) return;
  state[kind] = next;
  state.error = "";
  render();
}

function setDay(when) {
  if (state.busy) return;
  state.when = when;
  state.error = "";
  render();
}

function setDeparture(time) {
  if (state.busy) return;
  state.departure = time;
  state.error = "";
  render();
}

function shake() {
  el.fare.classList.remove("is-shaking");
  void el.fare.offsetWidth;
  el.fare.classList.add("is-shaking");
}

function explainBlock() {
  if (!state.from || !state.to) return "Set an origin and a destination.";
  if (state.adults + state.children === 0) return "Add an adult or a child before issuing.";
  if (!state.departure) return "Choose a departure.";
  return "";
}

function makeId() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `HL-${n}`;
}

function barcode(id) {
  let n = hash(id);
  let html = "";
  for (let i = 0; i < 46; i += 1) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    const width = (n % 3) + 1;
    const gap = (n >> 4) % 3 === 0 ? 3 : 1;
    html += `<i style="width:${width}px;margin-right:${gap}px"></i>`;
  }
  return html;
}

function ticketMarkup(ticket) {
  const coach = String(ticket.coach).padStart(2, "0");
  return `
    <header class="t-head">
      <div>
        <p class="t-brand">HALYARD</p>
        <p class="t-sub">King Street Depot · Window 04</p>
      </div>
      <p class="t-paid">Paid</p>
    </header>
    <p class="t-id">${ticket.id}</p>
    <div class="t-row"><span>Issued</span><b>${ticket.issuedLabel}</b></div>
    <div class="t-row"><span>Travel</span><b>${ticket.travelLabel}</b></div>
    <div class="t-row"><span>Coach</span><b>${coach} · open seating</b></div>
    <div class="t-route">
      <div><span>${ticket.fromCode}</span><strong>${ticket.fromName}</strong></div>
      <b aria-hidden="true">→</b>
      <div><span>${ticket.toCode}</span><strong>${ticket.toName}</strong></div>
    </div>
    <p class="t-km">${ticket.km} km</p>
    <table>
      <tbody>
        <tr>
          <td>Adult</td>
          <td>${ticket.adultCount} × ${money(ticket.adult)}</td>
          <td>${money(ticket.adultTotal)}</td>
        </tr>
        <tr>
          <td>Child</td>
          <td>${ticket.childCount} × ${money(ticket.child)}</td>
          <td>${money(ticket.childTotal)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2">Amount paid</td>
          <td>${money(ticket.total)}</td>
        </tr>
      </tfoot>
    </table>
    <div class="t-bars" aria-hidden="true">${barcode(ticket.id)}</div>
    <p class="t-code">${ticket.id}</p>
    <p class="t-foot">Carry this slip to the gate. Children ride at half fare.</p>
  `;
}

function buildSnapshot(priced, now = new Date()) {
  const travel = travelDate(now);
  return {
    id: makeId(),
    fromCode: state.from,
    toCode: state.to,
    fromName: stationByCode(state.from).name,
    toName: stationByCode(state.to).name,
    adultCount: priced.adultCount,
    childCount: priced.childCount,
    adult: priced.adult,
    child: priced.child,
    adultTotal: priced.adultTotal,
    childTotal: priced.childTotal,
    total: priced.total,
    km: priced.km,
    coach: priced.coach,
    when: state.when,
    departure: state.departure,
    issuedLabel: `${formatTicketDate(now)} · ${formatTicketTime(now)}`,
    travelLabel: `${formatTicketDate(travel)} · ${state.departure}`,
  };
}

function waitTicket() {
  if (!motionOK()) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      el.ticket.removeEventListener("transitionend", onEnd);
      resolve();
    };
    const onEnd = (event) => {
      if (event.target === el.ticket && event.propertyName === "transform") finish();
    };
    el.ticket.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, 1700);
  });
}

async function issue() {
  if (state.busy) return;
  const priced = currentQuote();
  const problem = explainBlock();
  if (problem || !priced) {
    state.error = problem || "Set an origin and a destination.";
    render();
    shake();
    return;
  }
  state.busy = true;
  state.error = "";
  if (state.ticketOut) {
    state.ticketOut = false;
    render();
    await waitTicket();
  }
  state.ticket = buildSnapshot(priced);
  state.ticketOut = false;
  render();
  void el.ticket.offsetWidth;
  state.ticketOut = true;
  render();
  await waitTicket();
  state.busy = false;
  render();
  revealTicket();
}

async function feed() {
  if (state.busy || !state.ticket) return;
  state.busy = true;
  state.error = "";
  if (state.ticketOut) {
    state.ticketOut = false;
    render();
    await waitTicket();
  }
  void el.ticket.offsetWidth;
  state.ticketOut = true;
  render();
  await waitTicket();
  state.busy = false;
  render();
  revealTicket();
}

async function clearSale() {
  if (state.busy) return;
  state.from = null;
  state.to = null;
  state.picking = "from";
  state.adults = 0;
  state.children = 0;
  state.when = "today";
  state.departure = null;
  state.error = "";
  if (state.ticketOut) {
    state.busy = true;
    state.ticketOut = false;
    render();
    await waitTicket();
    state.busy = false;
  }
  state.ticket = null;
  render();
}

function revealTicket() {
  const rect = el.ticket.getBoundingClientRect();
  if (rect.bottom > window.innerHeight - 8 || rect.top < 0) {
    el.ticket.scrollIntoView({
      behavior: motionOK() ? "smooth" : "auto",
      block: "end",
    });
  }
}

function buildStations() {
  el.stations.innerHTML = STATIONS.map(
    (station) => `
      <button type="button" class="station" data-code="${station.code}" aria-pressed="false">
        <b>${station.code}</b>
        <span>${station.name}</span>
      </button>`,
  ).join("");
}

function tickClock() {
  const now = new Date();
  el.clock.dateTime = now.toISOString();
  el.clock.textContent = now.toLocaleTimeString("en-GB", { hour12: false });
}

const pose = { scale: 1, rx: 9, ry: -13 };

function resetFit() {
  for (const prop of ["transform", "position", "top", "left", "width", "transformOrigin"]) {
    el.fit.style[prop] = "";
  }
  el.scaler.style.width = "";
  el.scaler.style.height = "";
  pose.scale = 1;
  pose.rx = 9;
  pose.ry = -13;
}

function applyPose() {
  el.fit.style.transform = `scale(${pose.scale}) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg)`;
}

function fit() {
  resetFit();
  if (window.innerWidth < 860) return;
  const naturalW = el.fit.offsetWidth;
  const naturalH = el.fit.offsetHeight;
  if (!naturalW || !naturalH) return;
  if (!motionOK()) {
    pose.rx = 0;
    pose.ry = 0;
  }
  el.fit.style.position = "absolute";
  el.fit.style.width = `${naturalW}px`;
  el.fit.style.left = "0px";
  el.fit.style.top = "0px";
  el.fit.style.transformOrigin = "center center";
  pose.scale = Math.min(
    1,
    (window.innerWidth - 48) / naturalW,
    (window.innerHeight - 48) / naturalH,
  );
  applyPose();
  let rect = el.fit.getBoundingClientRect();
  const budgetW = window.innerWidth - 28;
  const budgetH = window.innerHeight - 20;
  if (rect.width > budgetW || rect.height > budgetH) {
    pose.scale *= Math.min(budgetW / rect.width, budgetH / rect.height);
    applyPose();
    rect = el.fit.getBoundingClientRect();
  }
  const host = el.scaler.getBoundingClientRect();
  el.fit.style.left = `${host.left - rect.left}px`;
  el.fit.style.top = `${host.top - rect.top}px`;
  const fitted = el.fit.getBoundingClientRect();
  el.scaler.style.width = `${Math.ceil(fitted.width)}px`;
  el.scaler.style.height = `${Math.ceil(fitted.height)}px`;
}

function bind() {
  el.stations.addEventListener("click", (event) => {
    const button = event.target.closest(".station");
    if (!button) return;
    chooseStation(button.dataset.code);
  });
  el.times.addEventListener("click", (event) => {
    const button = event.target.closest(".time");
    if (!button) return;
    setDeparture(button.dataset.time);
  });
  el.modeFrom.addEventListener("click", () => {
    if (state.busy) return;
    state.picking = "from";
    render();
  });
  el.modeTo.addEventListener("click", () => {
    if (state.busy) return;
    state.picking = "to";
    render();
  });
  el.plaqueFrom.addEventListener("click", () => {
    if (state.busy) return;
    state.picking = "from";
    render();
  });
  el.plaqueTo.addEventListener("click", () => {
    if (state.busy) return;
    state.picking = "to";
    render();
  });
  el.dayToday.addEventListener("click", () => setDay("today"));
  el.dayTomorrow.addEventListener("click", () => setDay("tomorrow"));
  el.adultsDec.addEventListener("click", () => step("adults", -1));
  el.adultsInc.addEventListener("click", () => step("adults", 1));
  el.childrenDec.addEventListener("click", () => step("children", -1));
  el.childrenInc.addEventListener("click", () => step("children", 1));
  el.issue.addEventListener("click", () => {
    void issue();
  });
  el.issueHard.addEventListener("click", () => {
    void issue();
  });
  el.feed.addEventListener("click", () => {
    void feed();
  });
  el.clear.addEventListener("click", () => {
    void clearSale();
  });

  window.addEventListener("pointermove", (event) => {
    if (window.innerWidth < 860 || !motionOK()) return;
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    pose.rx = 9 - y * 2;
    pose.ry = -13 + x * 3;
    applyPose();
  });
  window.addEventListener("resize", fit);
}

buildStations();
bind();
render();
tickClock();
window.setInterval(tickClock, 1000);
fit();
if (document.fonts?.ready) document.fonts.ready.then(fit);
