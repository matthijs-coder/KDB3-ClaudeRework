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
- There is no `core/config/labels/` folder and no `en` translation; labels are German.
- Feature code reads labels and does not hard-code user text.
