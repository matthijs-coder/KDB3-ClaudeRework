// Layering rule shared by check-imports and its test: `core/**` never imports `dashboard/**`.
// The composition root (bootstrap/featureManifest.js) lives outside core/, so there is no exception.
export const ALLOWED_CORE_IMPORTERS = [];

// edges: [{ from, to, ... }] with paths relative to KDB3/js (as buildGraph returns them).
export function findLayeringViolations(edges, allowedImporters = ALLOWED_CORE_IMPORTERS) {
  return edges.filter((e) => e.from.startsWith('core/') && e.to.startsWith('dashboard/') && !allowedImporters.includes(e.from));
}
