# futureTodo: startLoading on an active key with a different mount orphans the previous spinner

**Date:** 2026-10-06 — parked by PO vastenburg (D-Q3 in `loadingService-deferredRemoval-ownership-contractdelta.md`)

- `startLoading` for a mountKey that is still active (`activeCount > 0`) on another mount element overwrites `domRefs.mountsByMountKey` / `spinnersByMountKey` (`applyLoadingOverlay.js:34,88,95`) without removing the previous spinner. The later finish removes only the new one.
- Possible hit: vis render key `kdb-widget-render-loading-{id}` when `widgetEl` changes between re-applies without a finish (`startWidgetRenderLoading.js:14-17`).
- Not the tab-mutation spinner bug (tab page and save/load slot always finish first; covered by WP-Q).
- Fix direction when revisited: on start with a different live mount for an active key, either remove the previous spinner or refuse and warn; decide `activeCount` semantics per mount.
