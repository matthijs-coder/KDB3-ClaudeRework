// W13 sweeps C and D: the proofs behind the removed code.
//  - C: the KDB constructor creates every root namespace (and elements.selectors, config.options); registering the real
//    manifest never replaces one of them, and the first manifest entry creates config.labels.de, so a registrar's own
//    `_KDB.x = _KDB.x || {}` could never fire.
//  - D: every `_KDB.api.<owner>.<method>` / `_KDB.services.<service>.<method>` whose `typeof ... === "function"` guard was
//    removed is a function property right after `registerAll` of the real manifest, before any mount.
// Run: node --test tools/tests/w13-registered-surface.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorld, probeRegistrars } from "../w13-guards.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/w13-removed-guards.json");
const ROOT_NAMESPACES = ["state", "runtime", "services", "api", "events", "config", "properties", "elements", "utils", "cognosAPI", "data"];

test("the constructor creates every root namespace, elements.selectors and config.options", () => {
  const { kdb } = createWorld();
  for (const name of ROOT_NAMESPACES) assert.ok(kdb[name] && typeof kdb[name] === "object", name);
  assert.deepEqual(kdb.elements.selectors, {});
  assert.deepEqual(kdb.config.options, {});
});

test("registerAll of the real manifest keeps the identity of every namespace the constructor created", () => {
  const { kdb, manifest, lifecycle } = createWorld();
  const before = Object.fromEntries(ROOT_NAMESPACES.map((name) => [name, kdb[name]]));
  const selectors = kdb.elements.selectors;
  lifecycle.registerAll(kdb, manifest);
  // `properties` is the one namespace the properties registrar replaces by the loaded values object.
  for (const name of ROOT_NAMESPACES.filter((entry) => entry !== "properties")) assert.strictEqual(kdb[name], before[name], name);
  assert.ok(kdb.properties && typeof kdb.properties === "object");
  assert.strictEqual(kdb.elements.selectors, selectors);
});

test("the first manifest entry creates config.labels.de, before any other registrar runs", () => {
  const { kdb, manifest } = createWorld();
  assert.equal(manifest.entries[0].name, "bootstrapLabels");
  assert.equal(kdb.config.labels, undefined);
  manifest.entries[0].register(kdb);
  assert.ok(kdb.config.labels && kdb.config.labels.de && kdb.config.labels.de.bootstrap);
  assert.ok(manifest.entries.findIndex((entry) => entry.name === "cognosHostSelectors") > 0);
});

test("every member behind a removed typeof guard is a function property after registerAll", () => {
  const { surface } = probeRegistrars();
  const proofs = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  assert.ok(proofs.length >= 40);
  for (const { guard, files } of proofs) {
    const [namespace, owner, method] = guard.split(".");
    assert.ok(surface[namespace][owner], guard + ": " + namespace + "." + owner + " is registered");
    assert.ok(surface[namespace][owner].includes(method), guard + " is a function property");
    for (const file of files) assert.ok(fs.existsSync(path.join(JS_ROOT, file)), file);
  }
});
