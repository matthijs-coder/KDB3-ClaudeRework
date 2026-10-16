// Prints the JSON clone cost of the widgetVis Dienststelle broadcast and TopN wave for several widget counts.
// Run: node tools/x4-clone-bench.mjs [N ...]   (default 5 10 20 40)
import { measureAll } from "./tests/lib/x4-clone-bench.mjs";

const sizes = process.argv.slice(2).map(Number).filter((n) => n > 0);
const rows = [];
for (const n of sizes.length ? sizes : [5, 10, 20, 40]) {
  const r = await measureAll(n);
  const fmt = (c) => c.calls + " clones / " + c.wholeStateCalls + " whole-state / " + c.bytes + " bytes";
  rows.push({ widgets: n, dienststelle: fmt(r.broadcast.cost), topNWave: fmt(r.wave.cost) });
}
console.table(rows);
