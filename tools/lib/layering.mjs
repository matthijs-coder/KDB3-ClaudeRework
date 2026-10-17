// Layering rule shared by check-imports and its test: `core/**` never imports `dashboard/**`.
// The only exception is the composition root (the feature manifest lists every dashboard orchestrator);
// the move of the manifest out of core/ empties this list.
export const ALLOWED_CORE_IMPORTERS = ['core/bootstrap/featureManifest.js'];

// edges: [{ from, to, ... }] with paths relative to KDB3/js (as buildGraph returns them).
export function findLayeringViolations(edges, allowedImporters = ALLOWED_CORE_IMPORTERS) {
  return edges.filter((e) => e.from.startsWith('core/') && e.to.startsWith('dashboard/') && !allowedImporters.includes(e.from));
}
