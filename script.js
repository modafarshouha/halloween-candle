const candle = document.getElementById("candle");
const relight = document.getElementById("relight");
const countEl = document.getElementById("count");
const daysEl = document.getElementById("days");
const form = document.getElementById("puzzle-form");
const feedback = document.getElementById("feedback");
const conclusion = document.getElementById("conclusion");
const locked = document.getElementById("locked");

const STORAGE_KEY = "candleDataPoints";
const LIT_KEY = "candleLastLit";
const FADE_MS = 30 * 1000;
const MAX_DARKNESS = 0.85;
const FULL_WAX = 110;
const MIN_WAX = 25;

let lastLit = Number(localStorage.getItem(LIT_KEY)) || Date.now();

function updateDarkness() {
  const progress = Math.min((Date.now() - lastLit) / FADE_MS, 1);
  document.documentElement.style.setProperty("--darkness", progress * MAX_DARKNESS);
  const wax = FULL_WAX - progress * (FULL_WAX - MIN_WAX);
  document.documentElement.style.setProperty("--wax-h", wax + "px");
}

updateDarkness();
setInterval(updateDarkness, 1000);

let dataPoints = Number(localStorage.getItem(STORAGE_KEY)) || 0;
countEl.textContent = dataPoints;

relight.addEventListener("click", () => {
  dataPoints += 1;
  localStorage.setItem(STORAGE_KEY, dataPoints);
  countEl.textContent = dataPoints;
  lastLit = Date.now();
  localStorage.setItem(LIT_KEY, lastLit);
  updateDarkness();
  candle.classList.remove("pulse");
  void candle.offsetWidth;
  candle.classList.add("pulse");
});

const DAY_MS = 24 * 60 * 60 * 1000;

// Today's calendar date in Central European time, as a UTC day number.
function todayCetUtc() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get("year"), utc: Date.UTC(get("year"), get("month") - 1, get("day")) };
}

function daysUntilNextHalloween() {
  const { year, utc } = todayCetUtc();
  let target = Date.UTC(year, 9, 31);
  if (target < utc) target = Date.UTC(year + 1, 9, 31);
  return Math.round((target - utc) / DAY_MS);
}

function updateDayCounters() {
  document.getElementById("elapsed").textContent = Math.round((todayCetUtc().utc - Date.UTC(2019, 9, 31)) / DAY_MS);
  daysEl.textContent = daysUntilNextHalloween();
}

updateDayCounters();
setInterval(updateDayCounters, 60 * 1000);

const ENTRIES = [
  { n: 1, dir: "down", row: 0, col: 2, word: "USUL", clue: "Paul Atreides's secret name among the Fremen." },
  { n: 2, dir: "down", row: 0, col: 4, word: "MINERVA", clue: "First name of the Gryffindor head of house who turns into a cat." },
  { n: 3, dir: "across", row: 1, col: 2, word: "SPICE", clue: "He who controls it controls the universe." },
  { n: 4, dir: "down", row: 5, col: 1, word: "LURCH", clue: "The Addams family's towering butler." },
  { n: 5, dir: "across", row: 6, col: 0, word: "OUTCAST", clue: "What Nevermore Academy admits: a student who does not fit in." },
];

// Cells whose letters, in order, spell the answer word.
const KEY_CELLS = ["3,2", "6,1", "0,4", "6,0", "1,2"];

const grid = document.getElementById("grid");
const cellMap = new Map();

ENTRIES.forEach((entry, index) => {
  entry.cells = [...entry.word].map((letter, i) => {
    const row = entry.row + (entry.dir === "down" ? i : 0);
    const col = entry.col + (entry.dir === "across" ? i : 0);
    const key = `${row},${col}`;
    if (!cellMap.has(key)) {
      const wrap = document.createElement("div");
      wrap.className = "cell-wrap";
      wrap.style.gridRow = row + 1;
      wrap.style.gridColumn = col + 1;
      const input = document.createElement("input");
      input.className = "cell";
      input.maxLength = 1;
      input.autocomplete = "off";
      input.dataset.answer = letter;
      input.setAttribute("aria-label", `Row ${row + 1}, column ${col + 1}`);
      wrap.append(input);
      grid.append(wrap);
      cellMap.set(key, { wrap, input, entries: [] });
    }
    cellMap.get(key).entries.push(index);
    return key;
  });

  const start = cellMap.get(entry.cells[0]);
  if (!start.wrap.querySelector(".cell-num")) {
    const label = document.createElement("span");
    label.className = "cell-num";
    label.textContent = entry.n;
    start.wrap.prepend(label);
  }

  const li = document.createElement("li");
  li.textContent = `${entry.n}. ${entry.clue} (${entry.word.length})`;
  document.getElementById(`clues-${entry.dir}`).append(li);
});

const cells = [...cellMap.values()].map((cell) => cell.input);
const keyOf = (input) => [...cellMap].find(([, cell]) => cell.input === input)[0];
let active = 0;
let moving = false;

function focusCell(key) {
  moving = true;
  cellMap.get(key).input.focus();
  moving = false;
}

// Move through the active word, then on to the next clue's first cell.
function step(key, delta) {
  const cellsInEntry = ENTRIES[active].cells;
  const i = cellsInEntry.indexOf(key) + delta;
  if (i >= 0 && i < cellsInEntry.length) return cellsInEntry[i];
  active = (active + delta + ENTRIES.length) % ENTRIES.length;
  const next = ENTRIES[active].cells;
  return delta > 0 ? next[0] : next[next.length - 1];
}

grid.addEventListener("focusin", (event) => {
  event.target.select();
  if (moving) return;
  const { entries } = cellMap.get(keyOf(event.target));
  const starts = entries.find((e) => ENTRIES[e].cells[0] === keyOf(event.target));
  const across = entries.find((e) => ENTRIES[e].dir === "across");
  active = starts ?? across ?? entries[0];
});

grid.addEventListener("mousedown", (event) => {
  if (event.target !== document.activeElement) return;
  const { entries } = cellMap.get(keyOf(event.target));
  if (entries.length > 1) active = entries.find((e) => e !== active);
});

grid.addEventListener("input", (event) => {
  event.target.value = event.target.value.toUpperCase();
  if (event.target.value) focusCell(step(keyOf(event.target), 1));
});

grid.addEventListener("keydown", (event) => {
  if (event.key === "Enter") event.preventDefault();
  if (/^[a-z]$/i.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    event.target.value = event.key.toUpperCase();
    focusCell(step(keyOf(event.target), 1));
  }
  if (event.key === "Backspace" && !event.target.value) {
    focusCell(step(keyOf(event.target), -1));
  }
});

const CONFETTI = ["🎃", "🕯️", "🦇", "⚡", "🕸️", "✨", "🔥"];

function celebrate() {
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.textContent = CONFETTI[i % CONFETTI.length];
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.animationDuration = 3 + Math.random() * 3 + "s";
    piece.style.animationDelay = Math.random() * 1.5 + "s";
    piece.addEventListener("animationend", () => piece.remove());
    document.body.append(piece);
  }
}

// Key letters fly out of the grid and line up to spell the answer.
async function gatherAnswer(onArrive) {
  const overlay = document.createElement("div");
  overlay.className = "magic-overlay";
  document.body.append(overlay);

  const gap = Math.min(64, window.innerWidth / (KEY_CELLS.length + 1));
  const flights = KEY_CELLS.map((key, i) => {
    const { wrap, input } = cellMap.get(key);
    const rect = wrap.getBoundingClientRect();
    const letter = document.createElement("span");
    letter.className = "magic-letter";
    letter.textContent = input.dataset.answer;
    Object.assign(letter.style, {
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
    overlay.append(letter);
    input.classList.add("taken");

    const dx = window.innerWidth / 2 + (i - (KEY_CELLS.length - 1) / 2) * gap - (rect.left + rect.width / 2);
    const dy = window.innerHeight * 0.25 - (rect.top + rect.height / 2);
    return letter.animate(
      [
        { transform: "translate(0, 0) scale(1)", offset: 0 },
        { transform: `translate(${dx / 2}px, ${dy / 2 - 80}px) rotate(180deg) scale(1.4)`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) rotate(360deg) scale(1.8)`, offset: 1 },
      ],
      { duration: 1600, delay: i * 150, easing: "ease-in-out", fill: "forwards" }
    ).finished;
  });

  await Promise.all(flights);
  overlay.classList.add("glow");
  onArrive();
  celebrate();
  await new Promise((resolve) => setTimeout(resolve, 3500));
  overlay.classList.add("fade");
  await new Promise((resolve) => setTimeout(resolve, 800));
  overlay.remove();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const wrong = cells.filter((cell) => cell.value.toUpperCase() !== cell.dataset.answer);

  if (wrong.length === 0) {
    feedback.textContent = "Correct. Results unlocked.";
    feedback.className = "feedback success";
    lastLit = Date.now();
    localStorage.setItem(LIT_KEY, lastLit);
    updateDarkness();
    cells.forEach((cell) => (cell.readOnly = true));
    await gatherAnswer(() => {
      locked.hidden = true;
      conclusion.hidden = false;
      conclusion.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  } else {
    feedback.textContent = "Try harder!";
    feedback.className = "feedback error";
    wrong[0].select();
  }
});

