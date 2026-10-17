# Conventions

Practical conventions that are not covered by `.cursor/rules/`. Salvaged from the retired pre-redesign rules (`_archive/cursor-rules-old/`). The rules win on any conflict: `dom.mdc` (DOM, CSS, observers, `<style>`), `core.mdc` (cloning, layers, ownership), `naming.mdc` (identifiers, labels), `runtime.mdc` (timers and cleanup).

## Performance

High-frequency events never run their work inline:

| Source | Handling | Delay |
|---|---|---|
| `resize` | debounce | about 150 ms |
| `scroll`, `wheel` | throttle (`_KDB.utils.throttle`) | about 50 ms |
| `mousemove`, drag position | one `requestAnimationFrame` per frame | per frame |
| `input` / `keyup` while typing | debounce | about 200 ms |
| Cognos filter-context rescans | coalesce the burst (debounce or throttle) | per module |

- Timers and frames go through the kit (`scheduleTimeout`, `scheduleFrame`, `sleep` in `core/utils/kit/`), so they are cancelled in `destroy`. Do not write a per-file debounce.
- Keep the wrapped handler in the owner's `runtime.<owner>` bucket so cleanup can remove it.
- "Heavy" work is anything O(n) over more than about 100 items, serialising a large object, a read-write layout loop, or anything that triggers another render synchronously. It does not run inside click/drag/scroll handlers, `requestAnimationFrame` callbacks or Cognos lifecycle hooks. Defer it (`setTimeout(fn, 0)`, `queueMicrotask`), debounce it, or batch it into one frame.
- Read all DOM measurements first, then write. No `getBoundingClientRect()` inside a write loop.

### Memoization

- Memoize only pure derived data that is recomputed in a hot path and whose inputs are stable.
- Keys are primitives or stable references (`Map<string, T>`, `WeakMap<object, T>`), never freshly built objects.
- The writer of the underlying state invalidates the cache.
- Never cache anything that touches the DOM.

## CSS files

- Folder: `KDB3/css/`, with sub-folders per UI area (`kdb-control/`, `filters/`, `widgets/`, `customButtons/`).
- File names are nouns for one UI area (`header.css`, `filters.css`). No catch-all files such as `common`, `misc`, `helpers`, `styles`, `main`.
- Load order is the order in `core/css/config/cssHrefList.js`. Later files win at equal specificity, so a new file goes where its cascade belongs.
- `url()` is relative to the CSS file. Only `widgets/widgetVis.css` uses images (`../../images/...`).
- Font Awesome is not shipped. Do not use `fa-*` classes. Host a11y helpers (`.sr-only`) are carried in `kdb.css`.
- Vendor CSS lives in `KDB3/css/libraries/` (see `KDB3/js/core/libraries/README.md`).

## Labels

- User-facing text lives in the module's `config.js` or in the `_KDB.config.labels.<lang>.<module>` buckets that the module orchestrators seed (for example `widgetBase`, `widgetSettings`, `messageService`, `loadingService`).
- There is no labels folder under `core/config` and no `en` translation; labels are German.
- Feature code reads labels and does not hard-code user text.

## Final layout (end of Phase 2)

Paths are relative to `KDB3/js/`. The layering gate is `tools/lib/layering.mjs`, enforced by `node tools/check-imports.mjs` (part of `node tools/check-all.mjs`, no allow-list).

| Folder | Role | May import |
|---|---|---|
| `KDB.js` | Cognos renderer entry (`render`/`destroy`), root namespaces, register/mount/destroy order | everything |
| `bootstrap/` | Composition root: `featureManifest.js` (ordered feature entries, each an `index.js` with `register(_KDB)`) and `registerServices.js`. The only place that names every feature and service | imported only by `KDB.js` (rule `composition-root`) |
| `core/` | Infrastructure: `bootstrap/` (boot lifecycle steps), `config/`, `events/` (shared event/action vocabulary: `createEventBus`, `tabs`, `filters`, `authoringMode`), `properties/`, `authoring/`, `cognosAPI/` + `services/cognosHost/` + `cognosHost/` (the three Cognos rings), `services/*` (history, loading, message, tableData, drillthrough, chrome, widgetBinding*), `utils/` (incl. the helper kit `utils/kit/`) | never `dashboard/` (rule `core->dashboard`) and never `workflows/` (rule `core->workflows`) |
| `dashboard/` | Feature modules (`header`, `footer`, `tabs`, `canvas/*`, `controls/toolbarControls`, `launchpad`, `metricsTree`, `widgets/*`, `filters/*`), each published as `_KDB.api.<module>` | `core/`; never `workflows/` (rule `dashboard->workflows`) |
| `workflows/` | Application sagas that drive several feature APIs: `parameterSet/` (writeback GET/SET services and the Cognos bridge) and `pdfExport/` (dashboard PDF). They publish `_KDB.services.*` and reach features through `_KDB.api.<owner>` at call time | `core/`; edges into `dashboard/` are reported by `check-imports`, not failed |

Kits and facades:

- `core/utils/kit/` is the helper kit (`async`, `data`, `errors`, `history`, `runtime`): use it instead of local timers, error guards, history-step and replay-handler code.
- `dashboard/filters/_core/` is the shared filter-owner kit (owner controller, owner policy, dock handoff, tab-mutation strategy, table-data watcher, parameter-set run claim). The five filter families (`sicht`, `singleSelect`, `specialSingleSelect`, `dienststelle`, `nativeMultiSelect`) use it; `filterDock` routes to them. Nothing outside `dashboard/filters/` imports `_core`.
- `selectors.js` facade rule: another module imports from an owner only its `selectors.js` (or `state/selectors.js`) and its event-name file (`events.js` or `core/events/*`). The facade may also re-publish the owner's `ACTION_TYPES` and, for `widgetSettings`, its hosted-panel helpers (transitional panel kit); anything else stays private to the owner. Commands go through `_KDB.api.<owner>.dispatch`.
- Entry files are `index.js` (`register(_KDB)` or `{ mount, destroy, dispatch, getState }`), also under `core/services/cognosHost/facets/<facet>/`. No `__controller` or `__orchestrator*` names remain (gate: `tools/tests/w14-naming.test.mjs`).

Doc and naming gates (part of `check-all`): `tools/check-doc-paths.mjs` fails when a living doc cites a code path that does not exist (allow-list `tools/doc-paths-allowlist.txt`, empty since W14; `--suggest` shows the rename-history target, `--fix` rewrites unambiguous ones); `tools/check-imports.mjs` also fails a relative `define` dependency id without `.js`.
