# KDB3

KDB3 is a Cognos Analytics dashboard extension. Cognos loads it through RequireJS: the entry is `KDB3/js/KDB.js`, declared as the widget renderer (`v1/ext/KDB3/js/KDB`) in `KDB3/spec.json`. The code is plain AMD (`define([...], function () {...})`) and has no build step.

Paths below are relative to this folder (`_____________KDB3API/`) unless they start with `../`.

## Start here

| Need | Read |
|---|---|
| Agent rules | `AGENTS.md`, `.cursor/rules/core.mdc` |
| Structure | `architecture/projectStructureRules.md` |
| Module map | `architecture/jsModuleMap.md` |
| State ownership | `architecture/stateOwnership.md` |
| Event catalog | `architecture/eventSubscribe.md` |
| Conventions | `architecture/conventions.md` |
| Module contracts | `contracts/README.md` |
| Static checks | `../tools/README.md` |
| Manual smoke test | `../tools/smoke-checklist.md` |
| Property paste sources | `__savedProperties/README.md` |
| Vendor libraries | `KDB3/js/core/libraries/README.md` |
| Images | `KDB3/images/README.md` |

## Layout

- `KDB3/`: the extension that is deployed.
  - `spec.json`: Cognos extension manifest (frozen external contract; property ids and renderer).
  - `js/KDB.js`: boot entry; registers and mounts the modules.
  - `js/bootstrap/`: composition root (`featureManifest.js`, `registerServices.js`), imported only by `KDB.js`.
  - `js/core/`: services, properties, events, Cognos adapters, CSS loader, vendored libraries.
  - `js/dashboard/`: canvas (kdbControl, page surface, drag and drop), controls, filters, header, footer, launchpad, metrics tree, tabs, widgets.
  - `js/workflows/`: application sagas over several features (`parameterSet` writeback, `pdfExport`).
  - `css/`: stylesheets, loaded in the order of `js/core/css/config/cssHrefList.js`. `css/libraries/` holds vendor CSS.
  - `images/`: icons and widget assets.
- `architecture/`: stable rules, catalogs and navigation help. `_archive/` is historical only.
- `contracts/`: one living contract per module. `_archive/` holds retired work orders and deltas.
- `__savedProperties/`: JSON strings to paste into the Cognos property panel. Not imported by code.
- `.cursor/rules/`: the rules for AI-assisted changes. `AGENTS.md` is the entry point.
- `../tools/`: Node checks (syntax, AMD imports, size report, tests) and the manual smoke checklist.

## Deploy

Zip the `KDB3/` folder and upload it as the Cognos extension. At runtime everything resolves under `./v1/ext/KDB3/` (declared in `spec.json`; the JS asset base is the single value in `js/core/config/assetBase.js`, used by `js/core/css/config/cssHrefList.js` and the image configs). Re-upload the extension whenever `spec.json` changes.

## Checks

```bash
node tools/check-all.mjs
```

Run it from the repository root. It checks syntax, AMD import paths and cycles, and runs the kit tests. It must pass before a change is merged.

## Smoke test in Cognos

There is no local runtime; verify in the browser console of a dashboard with the extension deployed. The full list is `../tools/smoke-checklist.md`. To load deployed modules by hand:

1. Configure the extension path first:
   `requirejs.config({ paths: { kdbExt: "./v1/ext/KDB3/js" }, waitSeconds: 45 });`
2. Load deployed files as `kdbExt/<path under js>` with `window.requirejs` (not `window.require`), for example `requirejs(["kdbExt/core/utils/sleep"], function (m) { console.log(m); });`.
3. A module that is already bundled in the running Cognos app and returns 403 under `kdbExt/` needs a bridge with the id the app uses: `define("tmpBridgeX", ["<runtimeId>"], m => m)`, then `requirejs(["tmpBridgeX"], ...)`.
4. Probes for load failures:
   - `requirejs.toUrl("kdbExt/...")` prints the resolved URL.
   - `fetch(requirejs.toUrl("kdbExt/..."), { method: "HEAD" }).then(r => console.log(r.status))`.
   - `requirejs.onError = e => console.error(e.requireType, e.requireModules, e)` (temporary; it overwrites an existing handler).
5. Reading the result: 404 means the file is not deployed or the path is wrong; 403 means use the bridge; a timeout (often with mixed `kdbExt/...` and app ids) means mixed ids or a missing `requirejs.config`.

`window.top.getKDB()` returns the `_KDB` object for inspection (`getKDB().state`, `getKDB().runtime`).

Browser checks after every change: no RequireJS errors, no 404 for JS, CSS or assets, and the expected `_KDB.api.<module>` exists.
