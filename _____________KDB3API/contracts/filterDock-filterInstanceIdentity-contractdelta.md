# Contract Delta: `filterDock` Filter-Instance Handoff

> Corrects the interaction handoff so tab identity is not mislabeled as Cognos
> scope identity and adds a reconcile-ready route without turning filterDock into
> a filter registry.

---

**Status:** `Approved CP-1 (contract text) — Implementation in progress — PO authorized 2026-07-15`
**Owner module / service:** `filterDock`
**Type:** `feature-module contract delta`
**Authoring AI:** GPT-5.6 Sol, 2026-07-15
**Reviewed by:** `three independent contract reviews + GPT-5.6 Sol final integral review, 2026-07-15; PO CP-1 text approved 2026-07-15`
**Parent contract:** `contracts/filterDock.md`
**Depends on:** `singleSelect-filterInstanceIdentity-contractdelta.md`,
`tabs-filterScopeSelectors-contractdelta.md`

---

## 1. Purpose And Current Defect

`filterDock` observes UI interaction and routes serializable hints to the responsible
owner. It does not know the complete Cognos filter inventory.

Current production copies the active `tabId` into both `scope` and `scopeId` and
constructs:

```txt
filterKey = pageContext__<filterLabel>
filterId  = <tabId>__<filterLabel>
```

The first loses instance scope; the second is only a KDB interaction ID. Neither is
the canonical `(Cognos scopeId, itemId)` identity.

This delta makes those semantics explicit and prevents a tab ID from masquerading
as a Cognos host scope.

It supersedes `filterDock.md` "Scope fields" and "Filter ID and filter key" lines
197–213 for the migrated route.

## 2. Ownership

- `filterDock` continues to own `_KDB.state.filters.filterDock` observation state.
- It owns no selection values and no instance registry.
- `lastClickedFilter` and `lastInteraction` remain last-event snapshots only.
- It does not enumerate `_KDB.cognosAPI.filters`.
- It does not write sibling filter or tabs state.
- Live DOM refs remain under `_KDB.runtime.filterDock.domRefs`.

## 3. Scope Resolution

`filterDock` resolves the active tab only through the published tabs selector:

```js
readActiveTabId(_KDB)
```

The existing direct read of `_KDB.state.tabs.currentTabId` is removed. Existing
`_KDB.utils.readCurrentTab()` may remain only as a temporary compatibility fallback
with `FILTER_DOCK_TAB_CONTEXT_DEGRADED`; it is not a state source.

Handoff fields:

```js
{
  scopeType: "global" | "pageContext",
  tabId: "<active tab id or null>",
  scopeId: "global" | null,
  scopeResolution: "global" | "ownerRequired"
}
```

Rules:

- Global interaction uses `scopeId: "global"`.
- Page-context interaction uses `scopeId: null` unless a future approved
  owner-provided mapping supplies an actual Cognos scope.
- `tabId` is a tab hint, not a filter identity.
- The receiving owner resolves `tabId → live scopeId` through the verified
  `tabs/resolveFilterScopeTargets` dispatch result and its Cognos inventory.
- Missing tab context does not become `"unknown"` identity; it produces
  `FILTER_DOCK_TAB_CONTEXT_MISSING`.

During the current filterDock tranche, only the singleSelect route is canonical:
it uses `tabId + scopeResolution` and ignores deprecated `scope` /
`scopeId=tabId` projection fields. Existing specialSingleSelect and Sicht routes
retain that deprecated projection until each owner's migration tranche lands.
After an owner migrates, its canonical route uses `tabId + scopeResolution` and
must ignore the deprecated fields. The projection is removed only after both owner
migrations and a repository search prove no route consumes it.

## 4. Identity Handoff

The serializable handoff becomes:

```js
{
  filterId: "<interaction id>",
  filterKey: "<semantic compatibility key>",
  filterInstanceId: null,
  filterLabel: "<configured/UI label>",
  itemNameHint: "<configured host item name or filterLabel>",
  itemIdHint: "<configured itemId or null>",
  semanticInstanceKeyHint: "<configured instanceKey or null>",
  scopeType: "global" | "pageContext",
  tabId: "<tab id or null>",
  scopeId: "global" | null,
  scopeResolution: "global" | "ownerRequired",
  filterType: "singleSelect" | "specialSingleSelect" | "sicht" | "dienststelle" | "unknown",
  interactionType: "open" | "option" | "confirm" | "cancel" | "clear" | "close" | "unknown",
  capabilities: {},
  filterConfig: {},
  popup: {},
  observedAt: 0
}
```

Normative semantics:

- `filterId` remains a UI-interaction correlation ID. It is not durable state
  identity.
- `filterKey` remains a semantic/legacy compatibility key.
- `filterInstanceId` is `null` because filterDock does not own canonical resolution.
- `itemIdHint` is copied from approved config when present; it is untrusted until
  matched to the owner inventory.
- `semanticInstanceKeyHint` is copied only from one already-resolved
  `filterPropObj[source].filterInstances[definitionId]` entry; label lookup alone
  may not select among siblings.
- `itemNameHint` is not a fallback state key; it is a matching hint.
- DOM signatures and nodes never become identity fields.

The receiver may return/record a resolved `filterInstanceId` in its own
`lastInteraction`, but filterDock does not mirror that result.

## 5. Filters-Ready Reconcile Route

The existing filters-ready observation remains dock/readiness evidence only.

Add `singleSelect` to the owner route map:

```js
{
  apiKey: "singleSelect",
  needsFilterDockFiltersReady: true,
  actionTypes: {
    filtersReady: "singleSelect/reconcileFilterInstances"
  }
}
```

This route-map addition and action registration are blocking prerequisites for
enabling the new owner inventory. Mount must fail/degrade visibly with
`SINGLE_SELECT_FILTERS_READY_ROUTE_MISSING` when the route is absent; click-driven
lazy inventory is not an accepted substitute.

Payload:

```js
{
  reason: "filtersReady",
  source: "filterDockFiltersReady" | "filterDockFiltersReadyTimeout",
  observedAt: 0,
  filterWrapperCount: 0
}
```

`filterWrapperCount` is diagnostic readiness evidence. It is not an expected
inventory count and must not be compared as registry completeness.

Dispatch failure behavior:

- absent owner API: `FILTER_DOCK_OWNER_API_MISSING`;
- owner dispatch throws synchronously: `FILTER_DOCK_OWNER_DISPATCH_FAILED`;
- asynchronous reconcile result is owned/observed by `singleSelect`; filterDock does
  not hold the Promise in durable state.

## 6. Interaction Ambiguity

When two same-label wrappers exist in one visible scope and filterDock cannot produce
a distinct config item hint, it still emits the observed handoff. The owner must
resolve it against inventory and reject ambiguous mutation with
`SINGLE_SELECT_INSTANCE_AMBIGUOUS`.

filterDock must not:

- append label suffixes;
- choose the first wrapper/item;
- inspect WBParameter values;
- scan the dock as a complete registry;
- cache owner state;
- infer itemId from DOM text.

## 7. Public API And State Projection

The existing dispatch-style surface remains unchanged:

```js
_KDB.api.filterDock = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

`lastClickedFilter` and `lastInteraction` add/rename fields according to §3–4 but
remain cloned serializable observation snapshots. Existing compatibility fields
`scope` and old `scopeId=tabId` may be exposed temporarily only as deprecated
projection fields. In the current tranche, only canonical singleSelect must not
consume them. specialSingleSelect and Sicht may consume the deprecated projection
until their respective owner migration tranche; after migration each must use
`tabId + scopeResolution` and ignore the deprecated fields.

## 8. Planned Implementation Impact

Expected touched production responsibilities after contract approval:

```txt
filterDock/effects/readFilterScope.js
filterDock/effects/readFilterIdentity.js
filterDock/effects/dispatchFilterHandoff.js
filterDock/effects/resolveFilterInteraction.js
filterDock/observation/detectAndDispatchFiltersReady.js
filterDock/state/selectors.js
```

Use only published tabs selectors. Do not import tabs internals or read foreign state.
Split files before exceeding project size/import limits.

## 9. Acceptance

1. Page-context handoff never reports a tab ID as Cognos `scopeId`.
2. Global handoff reports `scopeId: "global"`.
3. `itemIdHint` is preserved when config provides it.
4. Owner receives active tab context through an explicit `tabId` hint.
5. Initial filters-ready observation triggers singleSelect reconcile.
6. `filterWrapperCount` is never used as the filter registry.
7. No direct `_KDB.state.tabs` read remains in the touched path.
8. Existing owner routing for Sicht, specialSingleSelect and Dienststelle remains
   compatible.
9. No DOM identity or label suffix is introduced.

## 10. Out Of Scope

- canonical instance construction;
- Cognos enumeration/value reads;
- selection commit/restore;
- tab lifecycle mutations;
- PDF changes;
- changes to filterDock DOM observation ownership.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-07-15 | `Proposed → Draft CP-1` | PO vastenburg | Handoff correction approved for contract drafting; implementation remains blocked pending cross-review. |
| 2026-07-15 | `Draft CP-1 (blockers open) → Approved CP-1 (contract text)` | PO vastenburg | Master approval blockers closed via the canonical `singleSelect-filterInstanceIdentity-contractdelta.md` §16 decisions. Contract text approved; separate production-start authorization was still required at this entry; build/atomic-tranche gates apply. |
| 2026-07-15 | `Approved CP-1 (contract text) → Implementation in progress` | PO vastenburg | Production implementation authorized and started. Current filterDock tranche makes only singleSelect canonical; specialSingleSelect/Sicht retain deprecated scope projection until their owner migration tranches. |
