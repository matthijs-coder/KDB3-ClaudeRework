# KDB3 tools

Node >= 22, ESM, zero npm dependencies. Run from the repo root. All scripts only read `_____________KDB3API/KDB3/js` (never write).

| Command | Purpose | Exit 1 when |
|---|---|---|
| `node tools/check-all.mjs [--verbose]` | Runs the three checks below, one PASS/FAIL line each | any check fails |
| `node tools/check-syntax.mjs [--json]` | Parses every `.js` with `node:vm` (script mode); prints `file:line:col message`. UTF-8 BOM and UTF-16 vendor files are decoded first | any syntax error |
| `node tools/check-imports.mjs [--json] [--verbose]` | AMD `define([...])` dependency graph | broken relative path, cycle, or orphan not allowlisted |
| `node tools/line-report.mjs [--json] [--module <prefix>] [--top N] [--include-vendor]` | Size report: total/code lines, max line length, lines > 180 chars, files over 400/500/800 code lines, top N (default 30), per-module totals, files < 30 lines. `--module` takes a directory/file prefix, js-relative (`dashboard/tabs`) or repo-style (`_____________KDB3API/KDB3/js/dashboard/tabs`) | never for the report itself; exit 1 only on bad usage (`--module` without value or matching no file) |
| `node --test tools/tests/*.test.mjs` | Unit tests (kit etc.); `check-all` runs them only when at least one `tools/tests/*.test.mjs` exists (on Node 22 `--test` needs the glob, not the directory) | a test fails |

## What the import check does

- Roots: `KDB.js` plus every `.../ext/KDB3/js/<x>` string in `KDB3/spec.json`. Files not reachable from a root are **orphans**.
- Edges are the relative string paths in the first `define([...])` array (tokenizer skips comments, strings, regex, templates). `require`/`exports`/`module` and bare or plugin ids (e.g. `jquery`) are ignored and listed as "non-path deps".
- Files that depend on `"require"` also get **dynamic edges** for relative `*.js` string literals (runtime `require([...])`, used for the PDF vendors).
- `core/libraries/**` is vendored and not parsed. It is reported as `referenced`/`unreferenced` and never fails (`jquery-ui.min.js` has no reference; the CSS side is loaded separately).
- Cross-module summary: module = 2-3 leading segments (`core/services/<x>`, `dashboard/{canvas,controls,filters,widgets}/<x>`, else first two). `core/** -> dashboard/**` edges print a WARNING (known layering violations), never a FAIL.
- A cycle prints one concrete path (`a -> b -> a`); other members of a larger cycle group are listed after it (first 20). The checks also FAIL if no files or no entry roots are found.
- FAIL means: fix the import path or break the cycle; for an orphan either wire it in, delete it, or allowlist it on purpose.

## Orphan allowlist

`tools/orphan-allowlist.txt`: one glob per line relative to the repo root (`*` within a segment, `**` across segments), `#` starts a comment. Entries matching no file print `WARNING stale allowlist entry` (never fail); add `# keep` to an entry that is intentionally empty for now (e.g. the `core/utils/kit/**` entry). Remove entries when the file is deleted or becomes imported.

## Golden tests (Phase 1)

A workstream can test a pure AMD module (no DOM/Cognos at load time) without a browser:

```js
import { loadAmd } from '../lib/amd-loader.mjs';   // from tools/tests/*.test.mjs
const fn = loadAmd('/abs/path/to/KDB3/js/core/utils/readableTextColorForHex.js');
```

`loadAmd(absPath, { stubs, modules })` evaluates `define([...], factory)` with a fake `define`: relative deps are loaded recursively (cached per call, circular deps throw), `require`/`exports`/`module` are supported, and the factory result is returned.

- `stubs`: object of globals shadowed inside every loaded module (`{ window, document, setTimeout, console }`); nothing leaks into `globalThis`.
- `modules`: map for non-relative deps, e.g. `{ jquery: fakeJq }`; an unknown bare dep throws with a hint.
- Modules are compiled as sloppy-mode functions (the AMD factories add `"use strict"` themselves): an undeclared assignment at file level or in a non-strict factory leaks onto `globalThis`. Stub names must be valid JS identifiers (they become wrapper parameters).
- Modules run in the main Node realm, so `assert.deepStrictEqual` works on their results.
- Use `path.join(JS_ROOT, 'core/...')` with `JS_ROOT` from `tools/lib/amd-graph.mjs`.

Sanity check: `node tools/lib/amd-loader.selftest.mjs`.
