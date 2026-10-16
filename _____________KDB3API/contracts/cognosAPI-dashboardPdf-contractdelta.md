# Contract Delta: `cognosAPI.dashboard` for dashboard PDF

## Added Thin Methods
- `getDashboardVersion()`
  - Reads host `versionInfo` first and normalizes a non-empty host value to the text before the first `-` (legacy parity).
  - Falls back to dashboard spec (`version|schemaVersion|apiVersion|null`) when no host value is available.
- `getEnvironmentSource()`
  - Returns the host/environment URL used for `environmentRegex` classification.
  - The PDF service consumes this wrapper and does not access `window` or host location directly.
- `resolveCaptureRoot(tabLike)`
  - Requires a non-empty `pageId` or `tabId`.
  - Resolves a live page root whose current DOM state is active/visible.
  - `pageId` matches only page fields (`data-cv-page-id`, `data-page-id`, page `id`); `tabId` matches only tab fields (`data-tab-id`, tab `id`). Cross-typed attribute matches and unverified closest-element fallbacks are rejected.
  - Page and tab identity scopes are resolved separately. When both resolve, their roots must be equal or the proved tab identity scope/container must contain the proved page root; symmetric page-contains-tab fallback is rejected.
  - A proved page scope may return itself or a uniquely related active page root without tab attributes. A proved tab scope accepts only its unique active `.pagegenericPage` descendant; closest-ancestor and broad page-root fallback are forbidden.
  - Returns `null` when identity or active-root proof fails; there is no generic visible-page fallback.

## Constraints
- No new top-level `_KDB.*` namespaces.
- Access remains inside existing `_KDB.cognosAPI.dashboard`.
- Capture root must be resolved at capture time per tab (no global cached document root).
