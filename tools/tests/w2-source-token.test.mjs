// W2: rewriteUniqueNameSourceToken lives once (core/utils). Both former implementations are pinned by a golden
// recorded on the unchanged code: the utils copy (2 args) and the plan copy (via resolveHierarchyItemId).
// Run: node --test tools/tests/w2-source-token.test.mjs   (RECORD=1 rewrites the golden; only on intended changes)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const GOLDEN = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/w2-source-token.golden.json");
const util = loadAmd(path.join(JS_ROOT, "core/utils/rewriteUniqueNameSourceToken.js")).rewriteUniqueNameSourceToken;
const itemIds = loadAmd(path.join(JS_ROOT, "core/services/widgetBindingPlan/filters/filterItemIds.js"));

const VALUES = [
  "[Personal_KDB_TM1].[Sicht].[Sicht]",
  "[personal_kdb].[Sicht].[Sicht]",
  "[Other_TM1].[Jahr].[Jahr]",
  "[Only]",
  "no bracket [x]",
  "",
  "[",
  "[a][b]"
];
const SOURCES = [undefined, "", "Personal_KDB", "Personal_KDB_TM1", "personal_kdb_tm1", "Other"];
const TARGETS = ["Personal_KDB", "Personal_KDB_TM1", " Personal_KDB ", "", "  ", null, undefined, 7];

const CASES = [];
for (const value of VALUES) {
  for (const source of SOURCES) {
    for (const target of TARGETS) {
      CASES.push({ value, source, target });
    }
  }
}

function planCopy({ value, source, target }) {
  const matched = { entry: { itemId: value }, sourceKey: source };
  return itemIds.resolveHierarchyItemId(matched, { datasourceName: target });
}

const label = (c) => JSON.stringify([c.value, c.source === undefined ? "<undef>" : c.source, c.target === undefined ? "<undef>" : c.target]);
const record = process.env.RECORD === "1";
const golden = record ? { plan: {}, util2: {} } : JSON.parse(fs.readFileSync(GOLDEN, "utf8"));

test("plan copy (resolveHierarchyItemId) matches the golden", () => {
  for (const c of CASES) {
    const actual = planCopy(c);
    if (record) golden.plan[label(c)] = actual === undefined ? "<undef>" : actual;
    else assert.deepStrictEqual(actual === undefined ? "<undef>" : actual, golden.plan[label(c)], label(c));
  }
});

test("utils copy (2 args) matches the golden", () => {
  for (const c of CASES) {
    const actual = util(c.value, c.target);
    if (record) golden.util2[label(c)] = actual === undefined ? "<undef>" : actual;
    else assert.deepStrictEqual(actual === undefined ? "<undef>" : actual, golden.util2[label(c)], label(c));
  }
});

if (record) {
  process.on("beforeExit", () => fs.writeFileSync(GOLDEN, `${JSON.stringify(golden, null, 1)}\n`));
}
