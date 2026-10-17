// Layering rules shared by check-imports and its test (no allow-list):
//   core/**       never imports dashboard/** or workflows/**
//   dashboard/**  never imports workflows/**
//   bootstrap/**  (composition root: feature manifest, service registration) is imported only by KDB.js and itself
// workflows/** may import core/** and published dashboard surfaces; edges into dashboard/** are reported, not failed.
export const ROOT_IMPORTER = 'KDB.js';

export const LAYERING_RULES = [
  { id: 'core->dashboard', violates: (from, to) => from.startsWith('core/') && to.startsWith('dashboard/') },
  { id: 'core->workflows', violates: (from, to) => from.startsWith('core/') && to.startsWith('workflows/') },
  { id: 'dashboard->workflows', violates: (from, to) => from.startsWith('dashboard/') && to.startsWith('workflows/') },
  {
    id: 'composition-root',
    violates: (from, to) => to.startsWith('bootstrap/') && from !== ROOT_IMPORTER && !from.startsWith('bootstrap/'),
  },
];

// edges: [{ from, to, ... }] with paths relative to KDB3/js (as buildGraph returns them).
export function findLayeringViolations(edges) {
  const out = [];
  for (const e of edges) {
    for (const rule of LAYERING_RULES) {
      if (rule.violates(e.from, e.to)) out.push({ ...e, rule: rule.id });
    }
  }
  return out;
}

export function findWorkflowsToDashboard(edges) {
  return edges.filter((e) => e.from.startsWith('workflows/') && e.to.startsWith('dashboard/'));
}
