# Contract Delta: `tabs` Filter-Scope Selectors

> Publishes cloned, pure scope/tab matching without storing Cognos filter scopes in
> tabs state or allowing filter modules to deep-read `_KDB.state.tabs`.

---

**Status:** `Approved CP-1 (contract text) — Implementation in progress — PO authorized 2026-07-15`
**Owner module / service:** `tabs`
**Type:** `feature-module selector contract delta`
**Authoring AI:** GPT-5.6 Sol, 2026-07-15
**Reviewed by:** `three independent contract reviews + GPT-5.6 Sol final integral review, 2026-07-15; PO CP-1 text approved 2026-07-15`
**Parent contract:** `contracts/tabs.md`
**Related contracts:** `contracts/tabs-parameterSetRestore-contractdelta.md`,
`contracts/tabs-tabCrud-contractdelta.md`
**Consumed by:** `singleSelect-filterInstanceIdentity-contractdelta.md`,
`writeback-filterInstanceIdentity-contractdelta.md`

---

## 1. Purpose

Filter owners need to map a live Cognos filter `scopeId` to one physical dashboard
slot without persisting duplicate tab metadata. Tabs already owns stable slot
descriptors (`tabId`, `pageId`, index/order); it therefore publishes the pure match
projection.

Tabs does not become a filter registry and does not enumerate filter items.

This delta extends `tabs.md` §6 lines 214–239 and §8 lines 274–323 with the
dispatch result and selectors below; no parent state field is superseded.

## 2. Ownership

- `_KDB.state.tabs` remains owned only by tabs.
- No `scopeId` field is added to durable tab state.
- Existing runtime-derived parameter-set `tabTargets.scopeId?` remains an action
  result, not persisted state.
- Filter owners retain their own Cognos scope identity.
- Foreign modules use published tabs selectors or `_KDB.api.tabs`.

## 3. Normalization

One pure utility is canonical for every owner and consumer:

```txt
core/utils/normalizeCognosScopeId.js
```

`normalizeCognosScopeId(value)`:

- converts non-null input to trimmed string;
- removes only terminal `_tabpanel`;
- returns `""` for null/empty;
- performs no case folding, label rewriting or DOM lookup.

singleSelect identity, tabs matching, writeback GET and writeback SET import this
same utility. Parallel local normalizers are removed.

## 4. Published Selectors

Existing selectors remain:

```js
readActiveTabId(_KDB)
readTabTargets(_KDB)
readVisibleTabs(_KDB)
readTabByIndex(_KDB, index)
```

Add:

```js
readTabById(_KDB, tabId)
readTabScopeMatch(_KDB, scopeId, liveTabTargets)
```

`readTabById` returns a cloned slot descriptor or null.

`readTabScopeMatch` first compares normalized `scopeId` with the explicit
`liveTabTargets[*].scopeId` produced by §5. When that optional live map is absent,
it may compare normalized `tabId` and `pageId` aliases from every dashboard-role
slot and returns:

```js
{
  status: "ok" | "missing" | "ambiguous",
  evidence: "liveScope" | "alias" | null,
  scopeId: "<input>",
  tab: {
    tabId,
    pageId,
    index,
    tabIdx,
    visible,
    name
  } | null,
  candidates: []
}
```

Rules:

- helper tabs are excluded;
- hidden dashboard slots are included;
- `tabIdx` is position within dashboard-role order, matching writeback;
- one exact live-scope match returns `ok` with `evidence: "liveScope"`;
- one alias match returns `ok` with `evidence: "alias"` and is diagnostic-only;
- zero matches returns `missing`;
- multiple slot matches returns `ambiguous`;
- candidates are cloned and deterministically ordered;
- selectors have no logging, host calls or state mutation.

## 5. Live Filter-Scope Targets

The canonical live mapping is an effectful tabs action, not persisted state:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/resolveFilterScopeTargets",
  payload: {
    source: "singleSelectReconcile" | "writebackGet" | "writebackSet"
  }
});
```

It returns:

```js
Promise<{
  ok: boolean,
  tabTargets: {
    "<tabIdx>": { tabId, pageId, scopeId, visible }
  } | null,
  diagnostics: Array<{ code, tabIdx?, message }>
}>
```

`tabTargets` is always a map after a completed resolution, including a completed
result with per-target diagnostics. It is `null` only when resolution fails or is
cancelled; it is never omitted.

Before resolving live scopes, `tabs/resolveFilterScopeTargets` requires at least one
hydrated dashboard-role slot in tabs-owned `order` / `byIndex` with a live `tabId`.
If that readiness condition is not met, the action returns:

```js
{
  ok: false,
  tabTargets: null,
  diagnostics: [{
    code: "TABS_FILTER_SCOPE_TARGETS_NOT_READY",
    message: "tabs/resolveFilterScopeTargets requires hydrated dashboard tabs"
  }]
}
```

`TABS_FILTER_SCOPE_TARGETS_NOT_READY` is the filter-scope action's owner-level
readiness diagnostic. This action must not emit the writeback-specific
`WRITEBACK_TABS_NOT_READY` code; a writeback consumer may translate diagnostics only
at its own boundary. Cancellation likewise returns `tabTargets: null` with the
existing tabs cancellation diagnostic.

The action reuses the existing production path
`getTabsContainers()[physicalIndex].id` from `listTabScopeIds.js`; that layout
container ID is the concrete scope candidate. It does not store the result in
`_KDB.state.tabs`.

The consuming filter owner validates every returned scope candidate against the
currently enumerated `PageContextItem.getScope()` set after canonical normalization.
Missing or ambiguous validation returns
`TABS_FILTER_SCOPE_TARGETS_UNVERIFIED`; page-context reconcile/restore must not
continue by alias guess.

The existing parameter-set restore/reset result may reuse the same resolver so GET,
SET and owner reconcile receive one mapping implementation.

## 6. Reverse Matching

The canonical owner use case `tabId hint → one live scopeId` combines:

1. `readTabById(_KDB, tabId)`;
2. `tabs/resolveFilterScopeTargets`;
3. owner-supplied live scope IDs from Cognos inventory for verification;
4. the shared normalization utility.

Tabs does not publish a state selector `readScopeIdForTab` because filter scope IDs
are not tabs-owned durable state. Callers use the live action result and reject
zero/multiple verified matches.

## 7. Tab Mutation Semantics

The selectors describe physical slots:

- `tabId`, `pageId`, physical index and alias match remain slot-physical;
- `tabIdx` follows current dashboard-role order;
- content move/delete/duplicate does not mutate host scope identity;
- filter selections are permuted by filter owners according to the tab plan.

Selectors always read the latest tabs state, so consumers do not retain stale
tabId/pageId mappings in filter state.

## 8. Public API

The `_KDB.api.tabs` dispatch-style method set remains unchanged. Granular state
reads are selectors; live host mapping is the dispatch action from §5, not a named
API method.

## 9. Planned Implementation Impact

Expected responsibilities after contract approval:

```txt
dashboard/tabs/state/selectors.js
dashboard/tabs/state/buildTabTargets.js
dashboard/tabs/effects/listTabScopeIds.js
dashboard/tabs/actions/resolveFilterScopeTargets.js
core/utils/normalizeCognosScopeId.js
core/services/writeback/get/collectors/buildScopeIdToTabIdx.js
dashboard/filters/singleSelect/actions/restoreFilterInstances.js
dashboard/filters/filterDock/effects/readFilterScope.js
```

The writeback collector consumes the selector and deletes its duplicate alias-index
logic after equivalence verification.

## 10. Acceptance

1. A page-context scope maps to exactly one dashboard tab through a live layout
   container ID verified against Cognos filter scopes.
2. Hidden dashboard slots are resolvable.
3. Helper tabs are never returned.
4. Ambiguous aliases return candidates and no selected tab.
5. `readActiveTabId` replaces filterDock's direct tabs-state read.
6. No scopeId is added to `_KDB.state.tabs`.
7. Identity, GET and SET import the same normalization utility.
8. Tab move/delete/duplicate reads current slot descriptors without stale filter
   mappings.
9. Unverified scope/slot aliases fail visibly and never become canonical mapping.

## 11. Out Of Scope

- Cognos filter inventory;
- selection ownership;
- changing tab CRUD plans;
- persisting scope IDs;
- DOM-based scope matching;
- PDF.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-07-15 | `Proposed → Draft CP-1` | PO vastenburg | Selector direction approved for contract drafting; implementation remains blocked pending cross-review. |
| 2026-07-15 | `Draft CP-1 (blockers open) → Approved CP-1 (contract text)` | PO vastenburg | Master approval blockers closed via the canonical `singleSelect-filterInstanceIdentity-contractdelta.md` §16 decisions. Contract text approved; separate production-start authorization was still required at this entry; build/atomic-tranche gates apply. |
| 2026-07-15 | `Approved CP-1 (contract text) → Implementation in progress` | PO vastenburg | Production implementation authorized and started under the approved selector and tranche boundaries. |
