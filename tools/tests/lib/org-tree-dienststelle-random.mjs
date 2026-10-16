// Seeded random corpus for the dienststelle hierarchy-index oracle (Phase 2 W7b). Plain JSON values only, so the
// corpus can be committed as a fixture (tools/tests/fixtures/org-tree-dienststelle.random-corpus.json) and the
// test can assert that the generator still reproduces it.

export const SEED = 0x7b0001;
export const STRING_COUNT = 1000;
export const ROW_SET_COUNT = 120;

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TOKENS = [
  "a", "b", "10", "1", "Abt 7", "MA 05", " a ", "  ", " ", "", "x y", "Ü-1", "Bürgermeister", "日本", "ñandú", "😀",
  "a\nb", "\ta\t", "\u00a0a\u00a0", "a[b", "level02", "Org", "&", "DS_KAV|ALLE", "a.b", "0", "-1"
];
const SEPARATORS = [".", ".", ".", ".&", "", " ", "\n", "\r\n", "\r", "\u2028", "\u2029", "\u00a0", "\t", "\n\n", " . ", ","];
const AFFIXES = ["", "", "", "  ", "\n", "\t", " \n ", "\u00a0", "prefix ", " suffix", "x", "]", "[", "&"];
const DISPLAYS = ["Heer", "Luftwaffe", " Marine ", "Sanität", "Ü Stelle", "日本", "", "  ", "Heer "];

function pick(rnd, list) {
  return list[Math.floor(rnd() * list.length)];
}

function between(rnd, min, max) {
  return min + Math.floor(rnd() * (max - min + 1));
}

function segment(rnd) {
  const roll = rnd();
  const token = pick(rnd, TOKENS);
  if (roll < 0.55) return "[" + token + "]";
  if (roll < 0.75) return "&[" + token + "]";
  if (roll < 0.82) return "[" + token;
  if (roll < 0.88) return token + "]";
  if (roll < 0.92) return "[[" + token + "]]";
  if (roll < 0.95) return "[]";
  return token;
}

export function randomUseString(rnd) {
  const count = between(rnd, 0, 5);
  let text = pick(rnd, AFFIXES);
  for (let i = 0; i < count; i += 1) {
    text += segment(rnd);
    if (i + 1 < count) text += pick(rnd, SEPARATORS);
  }
  return text + pick(rnd, AFFIXES);
}

function randomCell(rnd, uses, displays) {
  const roll = rnd();
  const use = pick(rnd, uses);
  const display = pick(rnd, displays);
  if (roll < 0.12) return use;
  if (roll < 0.17) return between(rnd, 0, 99);
  if (roll < 0.22) return null;
  if (roll < 0.26) return [use, display];
  if (roll < 0.30) return { display: display };
  if (roll < 0.34) return { use: use };
  if (roll < 0.52) return { display: display, use: use };
  if (roll < 0.66) return { d: display, u: use };
  if (roll < 0.76) return { display: display, useValue: use };
  if (roll < 0.82) return { d: display, useValue: use, u: pick(rnd, uses) };
  if (roll < 0.88) return { text: display, id: use };
  if (roll < 0.92) return {};
  if (roll < 0.96) return { display: null, use: use };
  return "  " + use + "  ";
}

function randomRowSet(rnd) {
  const uses = [];
  const displays = [];
  const useCount = between(rnd, 2, 12);
  for (let i = 0; i < useCount; i += 1) uses.push(randomUseString(rnd));
  for (let i = 0; i < between(rnd, 1, 6); i += 1) displays.push(pick(rnd, DISPLAYS));
  const rows = [];
  const rowCount = between(rnd, 0, 7);
  for (let r = 0; r < rowCount; r += 1) {
    const roll = rnd();
    if (roll < 0.05) {
      rows.push(null);
    } else if (roll < 0.08) {
      rows.push("string row");
    } else if (roll < 0.12) {
      rows.push([randomCell(rnd, uses, displays), randomCell(rnd, uses, displays)]);
    } else {
      const row = {};
      const cols = between(rnd, 1, 4);
      for (let c = 0; c < cols; c += 1) row[pick(rnd, ["c1", "c2", "level00", "level01", "level02", "3"])] = randomCell(rnd, uses, displays);
      rows.push(row);
    }
  }
  return rows;
}

export function buildRandomCorpus() {
  const rnd = mulberry32(SEED);
  const strings = [];
  for (let i = 0; i < STRING_COUNT; i += 1) strings.push(randomUseString(rnd));
  const rowSets = [];
  for (let i = 0; i < ROW_SET_COUNT; i += 1) rowSets.push(randomRowSet(rnd));
  return { seed: SEED, strings: strings, rowSets: rowSets };
}

function json(value) {
  return JSON.stringify(value).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function corpusToFileText(corpus) {
  const lines = [];
  lines.push('  "seed": ' + corpus.seed);
  lines.push('  "strings": [\n' + corpus.strings.map((s) => "    " + json(s)).join(",\n") + "\n  ]");
  lines.push('  "rowSets": [\n' + corpus.rowSets.map((r) => "    " + json(r)).join(",\n") + "\n  ]");
  return "{\n" + lines.join(",\n") + "\n}\n";
}
