# Module Contract: `dienststelle`

> CP-1 draft for a DIRECT PORT from REDESIGN2 `stelleHierarchy` into the production `dienststelle` dashboard filter module.
> No production code may be generated until this contract is approved.

---

**Status:** `Approved`
**Owner module / service:** `dienststelle`
**Type:** `dashboard/filters feature module`
**Authoring AI:** GPT-5.5, 2026-05-26
**Reviewed by:** `user CP-1 approval, 2026-05-26`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Direct-Port Scope

Target after CP-1 and execution-spec approval:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/
```

This is a direct-port tranche with rule-alignment and explicit CP-1 decisions:

- port REDESIGN2 `stelleHierarchy` behavior as the canonical baseline;
- rename the production owner to `dienststelle`;
- route `filterDock` handoffs with `filterType: "dienststelle"` to `_KDB.api.dienststelle`;
- receive confirmed Sicht changes from `_KDB.api.sicht` through direct dispatch;
- own `_KDB.state.filters.dienststelle`;
- implement history snapshot/replay hooks for direct Dienststelle commits and Sicht dependency snapshots;
- defer parameter-set/writeback restore and KDB2-only tree/savedSettings behavior.

`dienststelle` is not a shared service and must not land under `core/services/`.

## 1. Investigation Evidence

The mandatory Step 0 investigation gate is satisfied by three user-supplied reports:

1. REDESIGN2 `stelleHierarchy` investigation report: primary behavioral source for state, reconcile, defaulting, widget propagation, history, and filterDock/sicht integration.
2. `laatsteOriginal` `hierarchy` delta report: secondary gap/delta source for original KDB2 hierarchy tree, popup lifecycle, parameter-set restore, BW legacy mapping, and missing REDESIGN2 behaviors.
3. Current production integration report: exact hook points in `filterDock`, `sicht`, `singleSelect`, history, and `tables.js`.

Source priority:

| Source | Status in this contract |
|---|---|
| `_______REDESIGN2/KDB3/js/dashboard/filters/stelleHierarchy/` | Canonical behavioral baseline. |
| `laatsteOriginal/KDB2/js/filters/hierarchy/` | Gap/delta evidence only; no behavior is added from it unless explicitly included below. |
| `_______KDB3/` | Not used as a behavioral source or copy source for this port. Current production integration points in `_____________KDB3API` must still be verified before edits. |

Legacy-to-production rename:

```txt
stelleHierarchy / hierarchy -> dienststelle
```

Mapped REDESIGN2 files:

| REDESIGN2 file | Evidence used | Production mapping |
|---|---|---|
| `__stelleHierarchyOrchestrator.js` | Interaction state machine for open / cancel / clear / option / confirm; confirm reads Cognos values through reconcile. | `__orchestratorDienststelle.js` plus controller/effects split. |
| `setupStelleHierarchy.js` | Setup for widget bridge subscription and label sanitizing bootstrap. | `mount` / setup effects, with observer lifecycle adjusted to current `filterDock` ownership. |
| `ensureHierarchyState.js` | Root and per-filter state shape. | `state/initialState.js`, reducer and selectors for `_KDB.state.filters.dienststelle`. |
| `reconcileConfirmedHierarchy.js` | Core commit/reconcile, defaults, Cognos writes, dominance, sticky sync, event emit. | `effects/reconcileConfirmedDienststelle.js` split into focused helpers. |
| `restoreHierarchyPopupSelection.js` | DOM-only popup checkbox restore on cancel/close. | `view/syncDienststelleViewFromState.js` or a focused popup-sync effect if approved by execution spec. |
| `buildCommittedStep.js` | History step payload for hierarchy commits. | `history/buildCommittedStep.js` with `filter_dienststelle`. |
| `__stelleHierarchyHistoryAdapter.js` | Replay of direct hierarchy history steps. | `history/applyDienststelleHistoryReplay.js` and replay handler. |
| `readDefaultValue.js` | Reads default table row from `{filterName}Default`. | `effects/readDefaultDienststelleValue.js` using `tableDataService` / configured table keys. |
| `awaitHierarchyDataReady.js` | Polls hierarchy semantics readiness. | `effects/awaitDienststelleDataReady.js`. |
| `resolveHierarchyDataKey.js` | Maps active filter to hierarchy data key. | `config/dienststelleDefinitions.js` and `effects/resolveDienststelleDataKey.js`. |
| `isValueAvailableInHierarchyData.js` | Validates default/restored value against hierarchy semantics. | `effects/isDienststelleValueAvailable.js`. |
| `applyWidgetDownstreamEffects.js`, `applyWidgetDownstreamEffect.js`, `applySingleWidgetDownstreamEffect.js`, `resolveRelevantVisualizationWidgetTarget.js` | REDESIGN2 widget propagation logic. | Deferred to future visual widget owner API boundary; no direct widget state/runtime writes in this contract. |
| `setupHierarchyVisibleLabelSanitizing.js`, `sanitizeVisibleHierarchyLabel.js`, `sanitizeWidgetDownstreamDisplayValues.js` | Label sanitizing rules. | Pure sanitizer functions owned by `dienststelle`; lifecycle trigger owned by `filterDock` unless CP-1 later approves another route. |

Explicitly deferred KDB2-only gaps:

- parameter-set/writeback restore (`restoreDienststelleFromParameterSet`);
- BW old-to-new ID map;
- `optionsFlat` validation from live hierarchy table render;
- KDB2 in-memory node tree / `savedSettings` tree;
- original OK forwarding, out-click catcher, commit polling and post-OK watcher;
- original popup lifecycle cleanup helper as a standalone behavior model.

## 2. Purpose

`dienststelle` owns the downstream Dienststelle hierarchy filter behavior for dashboard filters. It reacts to filterDock hierarchy interactions and confirmed Sicht changes, reconciles confirmed Dienststelle selections against Cognos filter state and tableData-backed hierarchy semantics, guarantees that a valid Dienststelle selection exists for every relevant scope, exposes replayable snapshots, and coordinates approved downstream effects through owner APIs.

It does not own generic filterDock observation, generic single-select behavior, Sicht state, widget state/runtime, parameter-set restore, or tableData loading.

## 3. Placement And Classification

Target:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/
```

Classification: dashboard/filters feature module.

Rationale:

- Dienststelle is a dashboard filter owner module, not reusable infrastructure.
- `filterDock` already classifies downstream hierarchy filters as `filterType: "dienststelle"`.
- `filterDock` uses direct API dispatch for known filter owners.
- The production name `dienststelle` matches `filterDock` filter type and avoids carrying the legacy `stelleHierarchy` name into the public API.

## 4. Ownership

- Canonical state subtree: `_KDB.state.filters.dienststelle`.
- Canonical writer: `dienststelle` only, through reducer / owner writers.
- Foreign-write paths: none.
- `filterDock` must not mutate `_KDB.state.filters.dienststelle`; it dispatches handoff payloads.
- `sicht` must not mutate `_KDB.state.filters.dienststelle`; it dispatches confirmed Sicht changes.
- `dienststelle` must not write `_KDB.state.filters.sicht`, `_KDB.state.filters.filterDock`, `_KDB.state.filters.singleSelect`, `_KDB.state.filters.specialSingleSelect`, or widget state.

Initial state shape:

```js
_KDB.state.filters.dienststelle = {
  lifecycle: "idle",
  activeSichtValue: null,
  activeFilterKey: null,
  visibleFilterLabel: "Dienststelle",
  activeHierarchyTableKey: null,
  activeDefaultTableKey: null,
  byFilter: {},
  resolution: {
    activeFilterKey: null,
    visibleFilterLabel: "Dienststelle",
    dominantScope: null,
    dominantValues: [],
    downstreamValues: [],
    pageContextValuesByScope: {},
    resolvedAt: null
  },
  defaults: {},
  replay: {
    isApplyingHistory: false,
    lastAppliedAt: null
  },
  meta: {
    lastFilterDockHandoffAt: null,
    lastSichtChangeAt: null,
    lastConfirmedAt: null
  },
  errorCode: null,
  errorMessage: null
};
```

Per-filter state shape:

```js
_KDB.state.filters.dienststelle.byFilter[filterName] = {
  filterKey: "Dienststelle_BW",
  visibleFilterLabel: "Dienststelle",
  status: "idle",
  isActive: false,
  currentSelectionByScope: {
    global: {
      scopeId: "global",
      currentValues: [],
      backupValues: [],
      pendingValues: [],
      lastObservedHostValues: [],
      lastConfirmedAt: null
    },
    pageContext: {}
  },
  resolution: null,
  lastInteraction: null,
  lastDefaultAt: null,
  lastConfirmedAt: null,
  errorCode: null,
  errorMessage: null
};
```

PageContext entry shape:

```js
_KDB.state.filters.dienststelle.byFilter[filterName]
  .currentSelectionByScope.pageContext[scopeId] = {
    scopeId: scopeId,
    currentValues: [],
    backupValues: [],
    pendingValues: [],
    lastObservedHostValues: [],
    lastConfirmedAt: null
  };
```

Lifecycle subset: `idle`, `ready`, `error`, `disposed`.

Per-filter `status` is a domain status, not lifecycle. Allowed domain statuses in this contract: `idle`, `pending`, `active`, `removed`, `loading`, `error`.

### Selection value shape

Every Dienststelle selection array uses one explicit value object shape:

```js
{
  displayValue: "Dienststelle A",
  useValue: "[Dienststelle].[A]",
  source: "cognos" | "default" | "historyReplay"
}
```

Rules:

- `displayValue` is the user-visible label after Dienststelle label normalization.
- `useValue` is the Cognos value used for filter context writes and replay.
- `source` records how this owner learned or applied the value; it is not a lifecycle term.
- `currentValues`, `backupValues`, `pendingValues`, `lastObservedHostValues`, `dominantValues`, `downstreamValues`, defaults and history snapshots all use this shape.
- Do not store bare strings for Dienststelle selections unless a CP-1 contract delta explicitly changes the value shape.

### Filter key vs visible label

Dienststelle has one user-facing label and multiple internal active filter keys.

| Field | Meaning |
|---|---|
| `activeFilterKey` | Cognos host identity / `getItemName()` lookup key / config filter key for the active downstream filter, for example `Dienststelle_BW` or `Dienststelle_DEZPV`. |
| `visibleFilterLabel` | KDB user-facing display label after DOM label sanitizing, normally `Dienststelle`; this is not a Cognos host identity. |
| `activeSichtValue` | Confirmed Sicht display value, currently `BW` or `DEZPV`. |

`activeFilterKey` is used for mapping, history and Cognos filter context. `visibleFilterLabel` is used only for display, handoff readability and DOM label sanitizing. Cognos host lookup MUST use `activeFilterKey` and MUST NOT use `visibleFilterLabel` for `getItemName()` matching. They must not be collapsed into a single ambiguous `activeFilterName`.

Active-filter switching rule:

- `dienststelle/sichtChanged` is the canonical trigger that changes the active Dienststelle variant.
- `activeSichtValue: "BW"` resolves through `dienststelleDefinitions.js` to `activeFilterKey: "Dienststelle_BW"`.
- `activeSichtValue: "DEZPV"` resolves through `dienststelleDefinitions.js` to `activeFilterKey: "Dienststelle_DEZPV"`.
- The matching `byFilter[activeFilterKey]` entry is active; non-matching Dienststelle filter entries are inactive.
- FilterDock confirm/reconcile uses the last known owner context (`activeFilterKey`, table keys and scope state) and must not re-derive host identity from `visibleFilterLabel`.

Inactive-variant decision after CP-4.1 planning:

- On Sicht switch, Dienststelle must not remove and recreate the inactive Cognos filter variant as the normal path.
- Both Dienststelle Cognos filter shells may exist so their dashboard/filterDock positions remain stable.
- The inactive variant must have empty Cognos values, must be hidden in the UI, and must be ignored by Dienststelle filterDock handoff handling.
- The active variant must remain visible and must be reconciled/defaulted for the confirmed/current Sicht.
- Owner state must distinguish the active variant from inactive variants. Inactive variants may use status `inactive` if added by implementation, or `removed` only if the variant is truly absent from Cognos; state must not claim a variant is removed while a hidden empty shell still exists.
- Inactive hidden shells must not affect queries. If investigation proves that an empty hidden Cognos shell still filters data, this contract decision must be escalated before implementation continues.
- Full remove/rebuild of all filters after Sicht switch is explicitly out of scope for this tranche unless the user approves a separate filter layout/order architecture.

## 5. Runtime

- Owner namespace: `_KDB.runtime.dienststelle`.
- Cleanup trigger: `destroy()`.

Runtime shape:

```js
_KDB.runtime.dienststelle = {
  domRefs: {},
  listeners: {},
  subscriptions: {},
  abortControllers: {},
  observers: {},
  timers: {},
  pendingPromises: {}
};
```

Runtime rules:

| Bucket | Role |
|---|---|
| `domRefs` | Owner-local refs only when a handoff explicitly includes approved popup context. Dienststelle must not read `_KDB.runtime.filterDock`. |
| `listeners` | Expected empty by default; no dock-level listener owned by Dienststelle. |
| `subscriptions` | History / widget-owner / future approved subscriptions only; expected minimal. |
| `abortControllers` | Abortable reconcile, data wait, or replay work. |
| `observers` | Expected empty by default. No Dienststelle observer is added without explicit user approval. |
| `timers` | Bounded data-readiness polling only when not expressible through promises; cleaned on destroy. |
| `pendingPromises` | In-flight reconcile/default/replay work; ignored or aborted on destroy. |

Idempotency:

- `mount()` must not duplicate listeners, observers, timers, subscriptions, pending promises, runtime DOM refs or popup sync records.
- `destroy()` sets `_isDisposed = true` first, aborts/unsubscribes/disconnects, clears runtime, then marks lifecycle `disposed`.
- Public methods follow disposed-state discipline from `module-public-api.mdc`.

## 6. Public API

Surface:

```js
_KDB.api.dienststelle = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState,
  getCurrentHierarchySnapshot: getCurrentHierarchySnapshot
};
```

Style: dispatch + reducer for commands; `getState()` remains debug/snapshot only; cross-module hierarchy reads use `getCurrentHierarchySnapshot()` (backed by selector `readCurrentHierarchySnapshot(_KDB)`).

### `getCurrentHierarchySnapshot()`

Returns a cloned, serializable planner-ready hierarchy snapshot for downstream modules such as `widgetVis`. It does not return live state references.

```js
{
  activeDownstreamName: "Dienststelle_BW",
  filterId: "Dienststelle_BW",
  filterLabel: "Dienststelle",
  visibleFilterLabel: "Dienststelle",
  hierarchyItemId: "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW]" | null,
  activeHierarchyTableKey: "dienststelle_bw_hierarchy",
  resolution: {
    hasConfirmedSelection: true,
    dominantValues: ["<useValue>", ...],
    downstreamValues: ["<useValue>", ...],
    displayValues: ["<displayValue>", ...],
    dominantScopeKey: "global" | null,
    resolvedAt: 123
  },
  source: "dienststelle"
}
```

Rules:

- `dominantValues` and `downstreamValues` are string arrays using Cognos `useValue` tokens; object selection arrays from owner state are normalized here.
- Cardinality is `0|N` of the effective set, not first-only.
- When the planner effective set is assembled from `pageContextValuesByScope` (global dominant empty), flatten then unique by `useValue`, first-seen order, `displayValues` lockstep. The per-scope map itself is not unique’d and may hold the same member on many tabs.
- Optional `{ pageScopeId }` on `getCurrentHierarchySnapshot` selects one page-context scope (`"active"` or a tab id, resolved with `resolveRawPageContextScope`). Used only when global dominant is empty. A resolve miss returns an empty planner set, not the flatten. No-arg remains the flatten unique union. Widget bind uses the scoped form; drillthrough uses no-arg.
- `displayValues` is diagnostic-only and must not be passed to `widgetBindingPlan` as planner values.
- `hasConfirmedSelection` is `true` only when at least one effective `useValue` exists in the normalized snapshot.
- `hierarchyItemId` is resolved from `_KDB.properties.filterPropObj[activeFilterKey].itemId` when present; `widgetBindingPlan` still resolves item id from its own `config.filterPropObj` snapshot at plan time.
- `getState()` is not the semantic hierarchy binding contract for `widgetVis` / `widgetBindingPlan`.

Action types:

| Action type | Source | Purpose |
|---|---|---|
| `dienststelle/filterDockStateChanged` | `filterDock` route map | Handle click-observed hierarchy handoff: open, option, confirm, cancel, clear, close. |
| `dienststelle/filterDockPopupReady` | `filterDock` popup-ready route | Run approved popup-ready sync such as label sanitizing trigger and popup state reconciliation. |
| `dienststelle/filterDockFiltersReady` | `filterDock` batch filters-ready route | Run idempotent filterdock header-name sync after at least one `.filterItemWrapper` exists. |
| `dienststelle/filterDockCommittedDisplayObserved` | `filterDock` committed-display observer | Display-only leftover overlay plus existing `#` strip. No reconcile, default, `writeFilter`, history, or widget. |
| `dienststelle/sichtChanged` | `sicht` after confirmed commit/startup/replay | Select active downstream Dienststelle filter and reconcile defaults/selection for the new Sicht. |
| `dienststelle/historyReplayRequested` | history service / Sicht replay dependency | Replay a stored Dienststelle snapshot through the owner API. |
| `dienststelle/widgetSyncRequested` | future visual widget owner or parent integration | Optional re-apply through owner API; no direct widget writes. |
| `dienststelle/syncRequested` | local/bootstrap/integration hook | Idempotently re-read active host values and reconcile state. |
| `dienststelle/error` | internal catch boundary | Record owned error state. |
| `dienststelle/destroy` | `destroy()` | Mark lifecycle disposed. |

No mixed named-method surface is allowed.

## 7. Boundary With `filterDock`

`filterDock` owns generic filter popup routing, dock click listener, dock MutationObserver, popup-ready detection, wrapper class sync, and handoff assembly.

Future `filterDock` route after CP-1:

| `filterType` | Target API | Click action | Popup-ready action | Filters-ready action |
|---|---|---|---|---|
| `dienststelle` | `_KDB.api.dienststelle` | `dienststelle/filterDockStateChanged` | `dienststelle/filterDockPopupReady` | `dienststelle/filterDockFiltersReady` |

Rules:

- `dienststelle` consumes serializable handoff payloads.
- `filterDock` may dispatch a one-shot filters-ready notification when at least one `.filterItemWrapper` exists in the filterDock root; this is generic dock readiness, not Dienststelle-specific lookup.
- `dienststelle` must not read `_KDB.runtime.filterDock`.
- No event is introduced for this known-owner route.
- `filterDock/effects/dispatchFilterHandoff.js` is the exact future route-map insertion point after CP-1.
- `dienststelle/filterDockPopupReady` is included because it is the established Route B for owner popup sync in current `filterDock`.

Current handoff payload fields available:

```js
{
  filterId: "tabId__Dienststelle",
  filterKey: "pageContext__Dienststelle",
  filterLabel: "Dienststelle",
  filterType: "dienststelle",
  filterScope: "pageContext",
  scopeType: "pageContext",
  scopeId: "tabId",
  scope: "tabId",
  filterConfig: {},
  capabilities: {
    isUpstream: false,
    isDownstream: true,
    isHierarchy: true,
    isSingleSelect: false,
    hasAlleOption: false,
    condition: null
  },
  interactionType: "open",
  isAlleOption: false,
  optionLabel: null,
  popup: {},
  observedAt: 0
}
```

CP-1 payload gaps to address in implementation spec:

- active Sicht value is not in filterDock handoff and must come from `sicht` dispatch or `_KDB.api.sicht.getState()`;
- hierarchy table key is resolved inside `dienststelle` config, not passed by filterDock by default;
- popup option labels are not part of current handoff payload;
- if hierarchy popup readiness cannot be detected by existing popup selectors, a contract delta is required before adding an observer or new filterDock payload fields.

## 8. Label Sanitizing And Popup Observation

Label sanitizing is Dienststelle-specific transformation logic, but popup observer lifecycle belongs to `filterDock` by default.

DEZPV display sanitizing decision:

- `dienststelleDefinitions.js` owns a per-variant boolean, `shouldSanitizeOptionDisplay`.
- `BW` sets `shouldSanitizeOptionDisplay: false`.
- `DEZPV` sets `shouldSanitizeOptionDisplay: true`.
- The flag controls user-facing display sanitizing for popup option text and committed / closed filter display text.
- For leftover closed-chip chrome whose wrapper `#` source is not the current host member, DEZPV may also write `sanitize(hostDisplay)` onto the closed chip through the existing strip writer. That leftover overlay is not chrome-only sanitize. The overlay writes committed text **and** `title` (text span and `.wa-filterDock-filterItem-bottom`) even when leftover title has no `#`. Leftover `aria-label` may stay raw.
- Sanitizing must not change Cognos `useValue`, host identity, `activeFilterKey`, `visibleFilterLabel`, filter lookup, or persisted selection semantics.

Canonical visible-label transform:

1. Convert nullish input to an empty string and process display text only.
2. If the text contains no `#`, return the original display text unchanged.
3. Take the substring after the first `#` and trim it; if empty, return the original display text.
4. If that trimmed text contains `|`, take the substring after the first `|` and trim it when non-empty.
5. Only when a `|` was used, if the remaining text contains `" - "`, take the substring after the first `" - "` and trim it when non-empty.
6. Return the final trimmed display text.

Steps 1–6 transform the **chosen source**. They do not forbid replacing leftover closed-chip text that contains no `#` when the committed source is current-host `hostDisplay` that still contains `#`.

Approved display surfaces:

- DEZPV popup option text nodes.
- DEZPV popup option `aria-label` values are approved as source text for deriving the visible display text; they are not a required write target.
- DEZPV popup option `title` values may be sanitized as display/tooltip text when present.
- DEZPV committed / closed filter display text in the filterDock wrapper.
- Approved **committed leftover source** (DEZPV closed chip only): the current this-scope first-member raw `hostDisplay` / host `.d` when that string contains `#` and the wrapper `#` chrome (aria/title/text) is not that current host member. Host `.d` is not an approved popup source.

Aria-label decision:

- `aria-label` may retain the raw Cognos label with `#` / `|` fragments.
- A raw `aria-label` is not a failure when the user-visible text and optional title are sanitized.
- Sanitizing must never change Cognos `useValue`, host identity, lookup identity, persisted history identity, or selection semantics.

Filterdock header name decision:

- The user-facing filter title in `.wa-filterDock-filterName` must display `visibleFilterLabel`, normally `Dienststelle`, for both `Dienststelle_BW` and `Dienststelle_DEZPV`.
- This header-name rule is independent of `shouldSanitizeOptionDisplay`; BW also displays `Dienststelle`.
- The technical host identity must remain unchanged: do not mutate `[data-id]`, `activeFilterKey`, Cognos `getItemName()` lookup identity, `filterId`, `filterKey`, or handoff identity.
- The approved DOM write targets for the header name are `.wa-filterDock-filterName` `textContent` and `title` only.
- Scope must cover both global and pageContext filterDock buckets.
- Dienststelle owns the pure transform and DOM text update. FilterDock may signal dock/wrapper changes, but must not implement the `Dienststelle_* -> Dienststelle` string rule.
- On `dienststelle/filterDockFiltersReady`, Dienststelle may run idempotent header-name sync across the supported buckets. The action means at least one `.filterItemWrapper` exists; it does not guarantee that every Dienststelle wrapper exists.
- No Dienststelle-owned observer is added by default. If Cognos repeatedly overwrites `.wa-filterDock-filterName` outside existing Dienststelle/filterDock lifecycle triggers, escalate a filterDock-owned re-dispatch contract delta before adding a Dienststelle observer.

BW display remains unchanged by this variant-gated sanitizer.

Approved observer/lifecycle decision:

- No Dienststelle-owned observer is added.
- `filterDock` owns the generic `popupDisplayResync` observer lifecycle when repeated popup display sanitizing is required.
- `dienststelle` owns pure sanitizer functions such as `sanitizeDienststelleVisibleLabel`.
- `filterDock` may trigger Dienststelle popup-ready / display-sync dispatch; `dienststelle` may then apply sanitizer logic through approved handoff context. On leftover closed-chip chrome, Dienststelle may apply the committed leftover overlay (host `hostDisplay` as strip source) through the same committed-display path. Popup remains sanitizer-only / aria-first.
- Dienststelle may run explicit display sync after popup-ready, confirmed commit, default/reconcile, Sicht change, and history replay, but must keep DOM traversal scoped to Dienststelle wrappers/popup context.
- After a `filterDock` handoff with `interactionType: "confirm"`, Dienststelle must run committed / closed display sync using the handoff scope (`filterScope`, `scopeType`, `scopeId`) instead of a blind global fallback.
- If no scope handoff is available for a non-popup path such as Sicht sync, table sync, or history replay, committed display sync may inspect both supported dock buckets for the active `activeFilterKey`.
- Committed / closed display sync may be deferred with a bounded `requestAnimationFrame` sequence so Cognos can finish writing the closed filter text after OK/commit. After that defer, if wrapper `#` chrome is leftover versus the current this-scope host member, Dienststelle may write `sanitize(hostDisplay)` onto the closed other-dock chip. The rAF is still owner lifecycle work; popup `popupDisplayResync` is not responsible for committed display after OK.
- `dienststelle/filterDockCommittedDisplayObserved` remains display-only: no reconcile, default, `writeFilter`, history, Sicht host walk, or widget notify. It may run the same leftover overlay as other committed syncs. Empty global leftover must not receive the tab caption.
- `filterDock` observer callbacks must not implement Dienststelle string rules. They observe popup changes and re-dispatch to the Dienststelle public API.
- FilterDock-owned `popupDisplayResync` observer debounce/throttle resources live under `_KDB.runtime.filterDock`, not `_KDB.runtime.dienststelle`.

Reason:

- Cognos hierarchy popups recycle and rewrite option nodes during open, expand/collapse, scroll, and internal repaint.
- A one-time popup-ready sync is not sufficient for DEZPV option display sanitizing.
- Legacy behavior used popup observation / batching; the production ownership boundary places that lifecycle under `filterDock`.

Approved filterDock-owned `popupDisplayResync` behavior:

- attach only while the active open popup's owner route declares `needsPopupDisplayResync: true`;
- disconnect when the popup closes, the active filter changes, or `filterDock.destroy()` runs;
- observe `childList`, `subtree`, and relevant attributes, at minimum `aria-label`, `title`, `data-tid`, and `class` if implementation needs them for Cognos option recycling;
- coalesce mutation bursts with `requestAnimationFrame` by default; fallback to `setTimeout(..., 0)` only when needed;
- re-dispatch an owner command such as `dienststelle/filterDockPopupReady` or a narrower display-sync action through `_KDB.api.dienststelle.dispatch`;
- pass only approved serializable handoff metadata / current popup context. Do not store live popup refs in Dienststelle state.

Contract decision: a targeted `filterDock`-owned `popupDisplayResync` observer/re-dispatch path is approved for display sanitizing. Dienststelle opts in through the filterDock route-map capability `needsPopupDisplayResync: true`. A Dienststelle-owned `MutationObserver` remains forbidden unless the user explicitly approves a later contract delta.

## 9. Boundary With `sicht`

`sicht` owns `_KDB.state.filters.sicht` and confirmed active Sicht value. Dienststelle consumes confirmed Sicht changes through direct API dispatch.

Expected future dispatch site:

```txt
KDB3/js/dashboard/filters/sicht/effects/commitConfirmedSicht.js
```

Expected action:

```js
_KDB.api.dienststelle.dispatch({
  type: "dienststelle/sichtChanged",
  payload: {
    activeSichtValue: "BW",
    selection: { displayValue: "BW", useValue: "..." },
    source: "startup" | "user" | "historyReplay"
  }
});
```

Rules:

- `sicht` must not write Dienststelle state.
- `dienststelle` may read current Sicht through `_KDB.api.sicht.getState()` or a contract-approved selector, not by direct foreign state reads.
- Startup Sicht commit triggers Dienststelle defaulting through the same confirmed path.
- Manual Sicht selection triggers the same path.
- History replay triggers a replay-aware path with no duplicate history push.

## 10. Data Sources And Config

Module-local config should map active Sicht to Dienststelle table keys:

```txt
dashboard/filters/dienststelle/config/dienststelleDefinitions.js
```

Draft shape:

```js
{
  BW: {
    sichtDisplayValue: "BW",
    defaultTableKey: "dienststelle_bw_default",
    hierarchyTableKey: "dienststelle_bw_hierarchy",
    shouldSanitizeOptionDisplay: false
  },
  DEZPV: {
    sichtDisplayValue: "DEZPV",
    defaultTableKey: "dienststelle_dezpv_default",
    hierarchyTableKey: "dienststelle_dezpv_hierarchy",
    shouldSanitizeOptionDisplay: true
  }
}
```

Known table keys from `core/config/tables.js`:

| Key | Role |
|---|---|
| `dienststelle_bw_default` | BW default Dienststelle value. |
| `dienststelle_dezpv_default` | DEZPV default Dienststelle value. |
| `dienststelle_bw_hierarchy` | BW hierarchy semantics / rows. |
| `dienststelle_dezpv_hierarchy` | DEZPV hierarchy semantics / rows. |

Read discipline:

- Use `_KDB.services.tableData` public methods for default and hierarchy table data.
- Direct reads from `_KDB.state.tableData` are forbidden outside `tableDataService`.
- `_KDB.state.tablesLoaded` is legacy evidence only and is not reintroduced.
- `_KDB.data.hierarchies.byName` from REDESIGN2 is evidence, not a required production state target unless the current production data pipeline already publishes it through an approved owner.

## 11. Defaulting And Scope Semantics

User-approved defaulting rules:

1. Sicht startup sets the active Sicht first.
2. Confirmed Sicht change dispatches to Dienststelle.
3. Dienststelle selects the active hierarchy/default table keys from its config.
4. If no selection exists for the relevant scope, Dienststelle applies the default for that active Sicht.

There is no separate KDB2-style Dienststelle startup-default pipeline.

### 11.1 Minimum-Selection / Default-On-Empty-Commit Delta

Status: CP-1 draft for the minimum-selection tranche.

Investigation evidence:

- `laatsteOriginal/KDB2/js/filters/hierarchy/helpers/hierarchyPopupInteractionHelpers.js` and `hierarchyDefaultsHelpers.js` are the primary semantic source for user empty-commit behavior.
- The REDESIGN2 `stelleHierarchy` reconcile pipeline is delta evidence only; its pad-style organization may inform the production shape, but REDESIGN2 multi-scan/sticky forcing does not override the production contract.
- Current production architecture already provides committed host reads through `dienststelle/effects/readDienststelleHostSelection.js` (`lookupFilterRef`, `readFilterValues`, `listPageContextScopes`) and `_KDB.cognosAPI.filters`; do not port legacy OK polling unless CP-2 proves current reads are stale.

Minimum-selection invariant:

- An active Dienststelle filter must not remain with zero committed values on an eligible pageContext scope after a successful user commit path.
- User empty-OK that applies the active default also notifies via `_KDB.services.message` (`dienststelle-empty-ok-toast-contractdelta.md`). Startup / restore / history stay silent for that copy.
- Default-on-empty is a behavior-completion tranche, not a full re-port of the legacy hierarchy popup.
- The invariant is enforced only for the active Dienststelle variant (`Dienststelle_BW` or `Dienststelle_DEZPV`) resolved from the confirmed Sicht context.

Approved scenario rules for this tranche:

| Scenario | Contract behavior |
|---|---|
| S1 — Global clear, empty pageContext tabs | User deselects all global Dienststelle options and confirms; every eligible visible pageContext scope that is host-empty receives the active default. The global scope itself does not receive a default from the user-clear path. After S1 host defaults, the planner snapshot contains that default `useValue` once, even when every empty tab received it. After S1, a later `TABLE_DATA_CHANGED` (including late hierarchy `LOAD_FINISHED`) must carry `source: "tableData"` and must not default global. Tab defaults from the user-clear path stay. |
| S2 — Single tab clear, no global value | User clears one pageContext tab while global is empty; only that tab receives the active default. |
| S3 — Global has member-set, one tab cleared | No default is applied; global remains dominant and the cleared pageContext scope may stay empty because global supplies the effective member-set. |
| S4 — Tab has value, global cleared | Existing pageContext tab values remain leading after global clear; Dienststelle synchronizes to Cognos-native pageContext restore and must not force a REDESIGN2-style KDB sticky restore into Cognos. |
| S5 — Multiple tabs mixed | Tabs/scopes with committed values keep their values; only eligible visible pageContext scopes that are confirmed empty receive the active default. Values are never copied between tabs. |
| S6 — Default unavailable | If tableData is not ready, the default row is missing, or the default cannot be read from the configured active default table, Dienststelle does not invent a fallback; it records/logs according to existing error discipline and leaves behavior unresolved for reviewer evidence. |

Scope-empty decision:

- Scope emptiness is determined through current production host-read utilities, not through legacy `savedSettings`, `selectedValues`, post-OK watchers, or popup polling.
- The default read path is: resolve `activeFilterKey` from Dienststelle definitions, call `readDienststelleHostSelection.lookupFilterRef(_KDB, activeFilterKey, filterScope, scopeId)`, then call `readDienststelleHostSelection.readFilterValues(filterRef, _KDB.cognosAPI.filters)`.
- `readFilterValues(...) === null` is the architecture-level signal that the host scope currently has no committed Dienststelle values. Never return `[]`; a non-null result is the full member list.
- If CP-2 evidence shows that the immediate host read is stale after Cognos OK, stop and escalate before adding wait logic. The allowed follow-up shape is a small production helper around `_KDB.utils.waitFor` or an equivalent existing utility with a tight timeout; do not port the legacy 10-second OK polling loop.
- PageContext scope iteration uses current production scope ids from the filterDock handoff and/or `listPageContextScopes`; global is represented as `filterScope: "global"` / `scopeId: "global"`, pageContext as the concrete tab scope id.

Default source:

- Default values come from `readDefaultDienststelleValue.js` through `_KDB.services.tableData` and the active `dienststelleDefinitions.js` default table key.
- The active table keys remain `dienststelle_bw_default` / `dienststelle_dezpv_default` for defaults and `dienststelle_bw_hierarchy` / `dienststelle_dezpv_hierarchy` for hierarchy data.
- The empty-commit path may read the default on demand through the existing production helper; it must not reintroduce legacy `_KDB.dienststelleHierarchyData`, `_KDB.data.tables.byName`, or `{filterName}Default` string construction.

History decision:

- CP-1 selects option A: auto-default is part of the same user commit step.
- A Dienststelle user OK/confirm produces one `filter_dienststelle` history step whose `old` snapshot is captured before reconcile and whose `new` snapshot includes any default applied by that reconcile.
- Auto-default must not push a second history step.
- History replay must not auto-default unless the replay action explicitly carries a snapshot that already contains the defaulted values; replay does not create a new history entry.

Explicit non-goals for this tranche:

- Do not port laatsteOriginal native OK forwarding, out-click catcher timing, 10-second commit polling, post-OK watcher, legacy `savedSettings` / `selectedValues` cache model, or widget-local downstream apply code.
- Do not port REDESIGN2 `scanNonEmptyPageContexts`, `pageContextStickyByScopeId`, `pageRestoredAfterGlobalClear` Cognos forcing, or inactive-variant `removeFilterEverywhere`.
- Do not edit widget modules, bootstrap, rules, templates, or legacy trees for this delta.

### 11.2 Option A / multi-member host-read

> NL: Bevestigde hiërarchie is een lid-set (0|N), geen `values[0]`-collapse.
> Host-leeg is `null` (nooit `[]`); vis bindt `hierarchySnapshot` `useValue[]`.

**Status:** approved 2026-08-27. Producer cardinality lock only. S3, default apply, events, and `widgetVis` ownership unchanged.

#### Invariants

- **Host-read preserves all Cognos members.** `readDienststelleHostSelection.readFilterValues` (and every caller: reconcile, default-empty, waitForStable, sync) maps the **full** host member list to owner value-objects. Forbidden: `values[0]`, `normalizeHostValue(first)`, wrap `dominantValues: [_one]`, wrap `pageContext: [_one]`, wrap `applyScopeSelection` around a singleton when the host returned N.
- **Host-empty = `null`, never `[]`.** `[]` is truthy (“there is still something”). Cognos `[]` / no members → `null`. Owner-state empty arrays stay `[]` (zero objects). Do not mix the two layers.
- **Owner state stays `{ displayValue, useValue, source }[]`.** `currentValues`, `backupValues`, `pendingValues`, `lastObservedHostValues`, `dominantValues`, `downstreamValues` change cardinality **0|1 → 0|N** only. No bare strings in owner state (§4).
- **`getCurrentHierarchySnapshot()` stays planner `string[]` useValues** (metrics-source rewrite unchanged). When the planner effective set is assembled from `pageContextValuesByScope` (global dominant empty), `resolution.dominantValues` / `downstreamValues` are that flatten uniqued by `useValue`, first-seen order. A bag of identical tokens from N defaulted tabs is not an effective set. Owner-state / `SYNC_REQUESTED` maps are not unique’d. A non-empty global dominant set is unchanged (still the full 0|N member list, not first-only). `displayValues` diagnostic; **not** sent to `widgetBindingPlan`.
- **`payload.selection` MAY stay first-member-only** (diagnostic). Binding uses `hierarchySnapshot`, never `payload.selection`, never `getState()`, never `_KDB.state.filters.dienststelle`.
- **`waitForStable*` compares the full `useValue` set**, order-insensitive, not `[0]`. Empty expected ↔ observed `null`.
- **History / writeback / restore already persist sets** (`valuesByScope` object-arrays; v3 `filt.dstl.glob` / `byTab` string[]). Option A must **not nest** those sets inside another singleton slot.
- **S3 unchanged:** non-empty global member-set dominates; a cleared pageContext scope may stay host-empty when global supplies the effective set.
- **Default apply remains one default-object** (one default-table row) per eligible empty scope. Do not expand default into N invented members.
- **No new events. No `visualizationWidget` retarget.** Downstream remains `widgetVis/dienststelleChanged`.

No-empty Dienststelle invariant:

- It must never be the accepted final dashboard state that no relevant Dienststelle selection exists.
- If global is cleared by the user, every eligible visible pageContext tab scope must either keep its Cognos-restored value or receive the active default.
- Existing pageContext selections are preserved when Cognos natively restores them.
- Tabs without an existing pageContext selection receive the active default.

Global and pageContext behavior:

| Scenario | Contract behavior |
|---|---|
| Startup after confirmed Sicht default | Dienststelle applies active default where no selection exists. |
| User sets global Dienststelle | Global dominates pageContext through Cognos native semantics and Dienststelle resolution. |
| User clears global Dienststelle | Cognos-native pageContext restore is respected; missing tabs receive defaults. |
| User clears pageContext while global is empty | That tab receives the active default. |
| User has different pageContext values per tab | Preserve them; do not copy values across tabs. |
| Sicht changes active Dienststelle variant | Active variant is shown and reconciled/defaulted; inactive variant is cleared to empty Cognos values, hidden, and ignored by handoff. Do not remove/recreate as the normal path. |

Inactive variant and filter order:

- Dienststelle does not own a generic dashboard filter order engine.
- After Sicht switch, preserving existing filterDock position is preferred over remove/recreate semantics.
- The normal inactive behavior is `clearValues` + hide + handoff guard.
- `removePageContextFilter` may still be used only for explicit cleanup/recovery paths where absence is intended and verified.
- Rebuilding all filters except Jahr/Sicht and adding them back in order is not part of this module contract.

Sticky restore decision:

- Cognos native behavior was tested by the user: pageContext value `X` is restored after global value `Y` is selected and then cleared.
- Dienststelle does not force a custom sticky restore model.
- Dienststelle synchronizes its state to Cognos-native restored pageContext values after reconcile.
- If Cognos does not restore a value for a tab, Dienststelle applies the default for that tab.

Multi-scan decision:

- Do not copy a pageContext value from one tab to another.
- Do not use REDESIGN2 cross-tab scan behavior as a fallback.
- Missing pageContext values are filled from default, not from another tab.

## 12. Boundary With Widgets / `widgetVis`

REDESIGN2 directly applies widget downstream effects from `stelleHierarchy`. In this production contract, strict ownership changes that boundary.

Decision:

- Dienststelle does not write widget state or widget runtime directly.
- Dienststelle sends one broadcast downstream command to `_KDB.api.widgetVis.dispatch`; `widgetVis` owns fan-out to all relevant visible vis widgets.
- If `_KDB.api.widgetVis.dispatch` is unavailable, emit a temporary tagged console log and do not treat the missing API as an error.
- When `widgetVis` needs Dienststelle hierarchy context, it must consume the planner-ready `hierarchySnapshot` from the dispatch payload or call `_KDB.api.dienststelle.getCurrentHierarchySnapshot()`; it must not use `getState()` as the hierarchy binding contract and must not read `_KDB.state.filters.dienststelle` directly.

Canonical downstream dispatch:

```js
_KDB.api.widgetVis.dispatch({
  type: "widgetVis/dienststelleChanged",
  payload: {
    filterId: "...",
    filterLabel: "Dienststelle_DEZPV",
    activeFilterKey: "...",
    visibleFilterLabel: "Dienststelle",
    selection: {
      displayValue: "...",
      useValue: "...",
      source: "user" | "default" | "historyReplay"
    },
    hierarchySnapshot: { /* planner-ready snapshot from getCurrentHierarchySnapshot / readCurrentHierarchySnapshot */ },
    source: "user" | "sichtDefault" | "historyReplay"
  }
});
```

No envelope `widgetId` is sent; `widgetVis` fans out internally over `_KDB.state.widgets.vis.byId`.

`payload.selection` may stay first-member-only as a diagnostic. It is not the binding contract; binding uses `hierarchySnapshot`.

That payload snapshot is the scoped planner set when global is empty: confirming tab if the handoff is pageContext with a real tab `scopeId`; otherwise the active tab. A global/S1 handoff (`scopeId: "global"`) uses the active tab, not a resolve-miss empty set. It is not the flatten of all defaulted tabs.

Dispatch trigger:

- after successful user Dienststelle OK/confirm applies a new effective member-set;
- after successful Sicht-driven Dienststelle default/reconcile applies a new effective member-set;
- after successful history undo/redo replay applies a Dienststelle snapshot/effective member-set;
- not after purely visual label sanitizing.

Temporary log shape while `widgetVis` is not registered:

```js
console.info("[dienststelle.widgetVis.dispatch]", payload);
```

## 13. History

This tranche includes Dienststelle history contracts.

Standalone step key:

```txt
filter_dienststelle
```

Standalone step shape:

```js
{
  key: "filter_dienststelle",
  timestamp: 0,
  old: {
    activeSichtValue: "BW",
    activeFilterKey: "Dienststelle_BW",
    visibleFilterLabel: "Dienststelle",
    valuesByScope: {
      global: [],
      pageContext: {}
    }
  },
  new: {
    activeSichtValue: "BW",
    activeFilterKey: "Dienststelle_BW",
    visibleFilterLabel: "Dienststelle",
    valuesByScope: {
      global: [],
      pageContext: {}
    }
  }
}
```

Sicht dependency snapshot:

- `sicht` currently reserves `dependencies.dienststelle: null`.
- After Dienststelle exists, `sicht/history/readDependencySnapshots.js` may call `_KDB.api.dienststelle.getState()` or a future selector/snapshot action.
- Sicht replay may restore the embedded Dienststelle snapshot through `_KDB.api.dienststelle.dispatch({ type: "dienststelle/historyReplayRequested", ... })`.

Decision:

- Use both models:
  - standalone `filter_dienststelle` for direct user Dienststelle commits;
  - Sicht-embedded dependency snapshot for upstream Sicht changes that must restore matching Dienststelle state.
- Replay must run through Dienststelle public API.
- Replay must not push a new history step.

## 14. Events

Default CP-1 decision: no new event is required for filterDock or Sicht handoff.

Rationale:

- `filterDock -> dienststelle` is a known-owner command path.
- `sicht -> dienststelle` is a known-owner command path.
- Widget downstream communication should use the future widget owner API unless a real independent consumer justifies a fact-event.

Possible future fact-event:

```txt
dienststelle:confirmedChanged
```

This event is not introduced in this contract. If future widget or other independent consumers require it, add an `eventSubscribe.md` catalog entry and constants in the emitter's canonical event file before emitting.

## 15. Dependencies

- `_KDB` (always).
- `_KDB.api.filterDock` only through handoff payloads; no runtime reads.
- `_KDB.api.sicht.getState()` or direct `dienststelle/sichtChanged` dispatch payload for current Sicht.
- `_KDB.services.tableData` public methods for default and hierarchy data.
- `_KDB.services.history` for committed steps and replay handler integration, when available.
- `_KDB.cognosAPI.filters` for approved filter value reads/writes/replacements.
- Future `_KDB.api.visWidget` for downstream widget effects.

Deep files must not discover dependencies through `window._KDB`, `window.top.getKDB()`, `_KDB.runtime.filterDock`, DOM labels, or legacy globals.

## 16. Cognos Touchpoints

Approved Cognos responsibilities:

| Touchpoint | Purpose |
|---|---|
| Read current filter values by scope | Confirm Dienststelle selections from Cognos host state on confirm/reconcile. Preserve all host members; do not collapse to first-only. |
| Replace / clear filter context | Apply defaults and history replay values. |
| Verify committed values | Ensure Cognos accepted default/replay/commit values when wrapper supports verification. |

REDESIGN2 confirm model:

- Keep the REDESIGN2 pattern: confirm reads stable Cognos API values and reconciles owner state.
- Do not port original KDB2 native OK forwarding, out-click catcher, commit polling, or post-OK watcher in this tranche.
- If current production wrappers cannot provide reliable confirmed values, stop and escalate before reintroducing original KDB2 polling/click-forwarding.

## 17. DOM And View Discipline

Potential folders:

```txt
view/
  syncDienststelleViewFromState.js
```

Rules:

- Use `view/` for DOM builders, renderers, binders and view sync.
- Do not create a top-level `sync/` folder.
- Dienststelle does not own the filterDock observer lifecycle.
- Live DOM refs never go into `_KDB.state`.
- Runtime DOM refs, if any are approved, go under `_KDB.runtime.dienststelle.domRefs`.
- Label sanitizing functions are pure and should be testable without live DOM where possible.

## 18. Folder Layout

Production target after CP-1 and execution-spec approval:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/
  __orchestratorDienststelle.js
  createDienststelleController.js
  config/
    actions.js
    dienststelleDefinitions.js
  state/
    initialState.js
    createDienststelleReducer.js
    selectors.js
  effects/
    mapFilterDockHandoff.js
    reconcileConfirmedDienststelle.js
    readDefaultDienststelleValue.js
    awaitDienststelleDataReady.js
    resolveDienststelleDataKey.js
    isDienststelleValueAvailable.js
    applyDienststelleDefault.js
    syncDienststelleFromSicht.js
  view/
    sanitizeDienststelleVisibleLabel.js
    syncDienststelleViewFromState.js
  history/
    buildCommittedStep.js
    readDependencySnapshot.js
    applyDienststelleHistoryReplay.js
    createDienststelleHistoryReplayHandler.js
    stageDienststelleHistoryReplayHandler.js
```

Optional splits are allowed in the execution spec to keep file sizes under limits. Do not create vague folders such as `helpers`, `common`, `misc`, `manager`, or `shared`.

`events/` is not created unless CP-1 later approves a cataloged event.

## 19. Bootstrap And Integration

Expected integration after CP-1 approval:

- `KDB.js` or a future parent `dashboard/filters/__orchestratorFilters.js` registers `_KDB.api.dienststelle`.
- `filterDock/effects/dispatchFilterHandoff.js` routes `dienststelle` to `_KDB.api.dienststelle`.
- `sicht/effects/commitConfirmedSicht.js` dispatches confirmed Sicht changes to `_KDB.api.dienststelle`.
- History replay collection registers `filter_dienststelle` handler.
- `sicht` dependency snapshots may use Dienststelle public snapshot after it exists.

Parent orchestrator:

- There is no current production `dashboard/filters/__filtersOrchestrator.js`.
- Creating a parent filters orchestrator is not required for this tranche unless CP-1 expands scope.

Bootstrap ordering:

1. `filterDock` is mounted as dock observer/router.
2. `dienststelle` is registered and mounted before Sicht can emit its startup confirmed-Sicht dispatch.
3. `sicht` is mounted and may commit startup Sicht only after `_KDB.api.dienststelle` is available.
4. Exact `KDB.js` ordering is specified in the execution spec.

Startup dispatch rule:

- Startup Sicht dispatch to Dienststelle must not be lost.
- The preferred implementation is strict bootstrap ordering: mount Dienststelle before Sicht startup commit can notify dependents.
- If an execution spec proposes queue/defer behavior instead, it must state why strict ordering is impossible and request explicit approval before implementation.

## 20. Out Of Scope

- `_______KDB3/` as behavioral source or copy source.
- Parameter-set/writeback restore and BW old-to-new mapping.
- KDB2 `savedSettings` tree and in-memory hierarchy tree.
- Full port of `filterDock`, `sicht`, `singleSelect`, `specialSingleSelect`.
- Direct widget downstream writes without widget owner API.
- New events or `eventSubscribe.md` edits unless CP-1 expands scope.
- Extra Dienststelle observer without explicit user discussion and approval.
- TEST sandbox or browser harness.
- Editing legacy trees.
- Editing `.cursor/rules/`, authority docs, litmustest reports, or templates.

## 21. CP-1 Acceptance Matrix

| Dimension | Draft decision |
|---|---|
| Investigation reports used | REDESIGN2 `stelleHierarchy`, laatsteOriginal `hierarchy` delta, current production integration report. |
| Minimum-selection investigation used | Investigation agent 1 (`laatsteOriginal` primary empty-commit/default report), investigation agent 2 (REDESIGN2/current-production delta), and current architecture scope-empty investigation. |
| Behavioral baseline | Existing production `dienststelle` remains the baseline; for minimum-selection semantics, `laatsteOriginal` wins over REDESIGN2 where they conflict. |
| Final target path | `_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/`. |
| Production name | `dienststelle`; legacy `stelleHierarchy` / `hierarchy` renamed. |
| State owner/subtree | `_KDB.state.filters.dienststelle`. |
| Selection value shape | Arrays contain `{ displayValue, useValue, source }`; no bare strings. |
| Filter key vs label | `activeFilterKey` is internal (`Dienststelle_BW` / `Dienststelle_DEZPV`); `visibleFilterLabel` is user-facing (`Dienststelle`). |
| Runtime owner/buckets | `_KDB.runtime.dienststelle.{domRefs,listeners,subscriptions,abortControllers,observers,timers,pendingPromises}`; observers empty by default. |
| Public API surface | `_KDB.api.dienststelle = { mount, destroy, dispatch, getState }`. |
| filterDock contract | Direct dispatch actions `dienststelle/filterDockStateChanged` and `dienststelle/filterDockPopupReady`; no events. |
| Label sanitizing | Dienststelle owns pure sanitizer; filterDock owns generic `popupDisplayResync` observer lifecycle through route-map capability `needsPopupDisplayResync`; no Dienststelle-owned observer. |
| Filterdock header name | `.wa-filterDock-filterName` shows `visibleFilterLabel` (`Dienststelle`) for both BW and DEZPV while `[data-id]` / `activeFilterKey` remain technical. |
| Filterdock filters-ready | `filterDock` may dispatch `dienststelle/filterDockFiltersReady` once at least one `.filterItemWrapper` exists; Dienststelle uses it only to run idempotent header-name sync. |
| Sicht contract | `sicht -> dienststelle` via direct API dispatch after confirmed Sicht commit/startup/replay. |
| Hierarchy data source | Module config maps `BW` / `DEZPV` to `dienststelle_*_default` and `dienststelle_*_hierarchy`; read through `tableDataService`. |
| Defaulting | Sicht drives active context; Dienststelle defaults missing scopes. No separate KDB2 startup pipeline. |
| Minimum-selection scenarios | S1-S6 are in scope as documented in Section 11.1. |
| Empty-commit detection hook | User confirm/OK path through `filterDock -> dienststelle/filterDockStateChanged`; execution spec must pass the handoff scope and clear intent into reconcile without porting legacy OK polling. |
| Scope-empty check | Use current production host-read utilities (`readDienststelleHostSelection.lookupFilterRef` + `readFilterValues`) and `_KDB.cognosAPI.filters`; `null` means host-empty. No legacy polling unless CP-2 evidence forces escalation. |
| Global clear | Existing Cognos-native pageContext restore is respected; tabs without pageContext receive defaults. |
| Global default on user clear | User global-clear does not default the global scope; it defaults eligible empty visible pageContext scopes only. |
| PageContext clear while global has value | No default; global remains dominant. |
| PageContext clear while global is empty | The cleared tab receives the active default when host-empty and default is available. |
| Inactive variant after Sicht switch | Normal path is clear empty values + UI hide + handoff guard, not Cognos remove/recreate. Hidden empty shells may remain to preserve filterDock position. |
| Multi-scan | Do not copy pageContext values across tabs; use defaults for missing tabs. |
| REDESIGN2 sticky/scan | Reject `scanNonEmptyPageContexts`, `pageContextStickyByScopeId`, and `pageRestoredAfterGlobalClear` Cognos forcing for this tranche. |
| Default/tableData contract | Default source is `readDefaultDienststelleValue.js` through `_KDB.services.tableData` and active `dienststelleDefinitions.js` table keys. No legacy `_KDB.data.tables.byName` or `_KDB.dienststelleHierarchyData`. |
| DEZPV display sanitizing | Variant-gated by `shouldSanitizeOptionDisplay`; DEZPV popup options use the legacy `#` / `|` / `" - "` display transform on wrapper chrome. DEZPV leftover closed-chip chrome may use this-scope `hostDisplay` as strip source. BW remains unchanged. |
| Manual commit display sync | After Dienststelle OK/confirm, committed display sync uses the handoff scope and may defer with bounded `requestAnimationFrame`. Leftover closed chip on `#filterDock__other` may then take current-host `hostDisplay`. Popup observer does not own closed-display correction. Empty global leftover caption is not success and must not receive the tab caption. |
| Widget downstream | After successful user OK, Sicht-driven default/reconcile, or history replay, send the serializable Dienststelle change payload to `_KDB.api.widgetVis.dispatch` when available; until then log `[dienststelle.widgetVis.dispatch]`. No direct widget state/runtime writes. Downstream stays `widgetVis` + `hierarchySnapshot`; do not retarget to `visualizationWidget`. |
| History | Include standalone `filter_dienststelle` and Sicht dependency snapshot/replay contract; auto-default is part of the same user commit step (option A), never a second history step. |
| Parameter-set restore | Deferred. |
| Events | None in this contract. |
| Bootstrap | Required; Dienststelle must be registered/mounted before Sicht startup dispatch, so the startup notification cannot be lost. |
| Known behavior-preservation risks | Parameter-set restore deferred; widget downstream receiver module is not implemented yet and uses a temporary tagged log; hierarchy popup-ready criteria may need user-approved filterDock delta; no original KDB2 OK polling; if immediate host reads prove stale, escalate before adding wait logic; hidden empty inactive Cognos shells must be investigated for query impact before implementation finalization. |

## 22. Open Questions For Reviewer

Q1. Confirm that no extra Dienststelle observer may be added unless implementation proves current filterDock lifecycle cannot support label sanitizing and the user approves a concrete alternative.

Q2. Confirm that widget downstream effects are deferred to a future visual widget owner API rather than porting REDESIGN2 direct widget effects in this tranche.

Q3. Confirm that parameter-set/writeback restore stays deferred even though laatsteOriginal treats it as a major behavior path.

Q4. Confirm that the execution spec may include minimal hook edits in `filterDock`, `sicht`, history registration, and bootstrap, but no broader cleanup of those modules.

Q5. Confirm that `dienststelle/filterDockPopupReady` remains part of the public action contract even if popup-ready criteria require a later filterDock delta for hierarchy-specific DOM.

Q6. Confirm CP-1 approval for the minimum-selection delta in Section 11.1: S1-S6 scope, current-architecture host-read emptiness, no legacy OK polling, and history option A.

If CP-1 approves this contract, the next phase is:

```txt
_____________KDB3API/contracts/dienststelle-minimum-selection-execution-spec.md
```

The execution spec must include the mapping table, per-file `Rules to apply` checklist, anti-D1 / anti-D2 acceptance criteria, and explicit mapping from modified production files to legacy/current-architecture evidence. The direct-port no-behavior-change rule does not apply to this behavior-completion delta; implementation is limited to the approved CP-1 scenario set and must not silently add deferred behavior.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-05-26 | `Draft -> Approved` | user | CP-1 approved: REDESIGN2 baseline, production `dienststelle` name/state/API, filterDock and Sicht direct dispatch, explicit value shape, strict bootstrap ordering, deferred widget downstream and parameter-set restore. |
| 2026-05-30 | `Approved -> CP-4.1 delta` | user | Inactive Dienststelle variants should normally be cleared to empty values, hidden, and ignored by handoff instead of removed/recreated, to preserve filterDock position after Sicht switch. |
| 2026-05-30 | `CP-4.1 delta -> display/widget delta` | user | DEZPV display sanitizing applies to popup options and committed display through variant config; future widget downstream boundary targets `visualizationWidget` public API only. |
| 2026-05-30 | `display/widget delta -> popupDisplayResync delta` | user | Replaced Dienststelle-specific observer naming with generic filterDock `popupDisplayResync` capability; Dienststelle opts in through `needsPopupDisplayResync`. |
| 2026-06-02 | `popupDisplayResync delta -> manual commit display delta` | user | Manual Dienststelle confirm must run scope-aware committed display sync after Cognos writes the closed filter text; popup observer remains popup-only. |
| 2026-10-16 | leftover closed-chip overlay | PO GO via army Chip-B | Retracts 2026-06-02 “Cognos writes the closed filter text / we only sanitize” for leftover closed chrome. Source may be this-scope `hostDisplay`. Delta: `dienststelle-chip-b-leftover-overlay-contractdelta.md`. |
| 2026-06-02 | `manual commit display delta -> visualizationWidget placeholder delta` | user | Successful Dienststelle user OK, Sicht-driven default/reconcile, and history replay emit a future visualizationWidget payload or temporary tagged log; visualizationWidget reads Dienststelle through `_KDB.api.dienststelle.getState()`. |
| 2026-06-02 | `visualizationWidget placeholder delta -> filterdock header name delta` | user | Dienststelle filterdock header names display `Dienststelle` for both BW and DEZPV without changing technical host identity. |
| 2026-06-03 | `filterdock header name delta -> filterdock filters-ready delta` | user | Startup header-name sync may be triggered by a generic filterDock one-shot readiness notification once at least one `.filterItemWrapper` exists. |
| 2026-06-03 | `filterdock filters-ready delta -> minimum-selection CP-1 draft` | pending user CP-1 | Drafted default-on-empty-commit completion: S1-S6, host-read emptiness via current architecture, no legacy OK polling, history option A. |
| 2026-09-10 | SET restore chrome realign | PO vastenburg + dual grok 4.6 | `parameterSetRestore` awaits existing `deactivateInactiveDienststelleVariants` via `restoreSupport.realignInactiveVariants` before apply. No public `sichtChanged`. Delta: `dienststelle-parameterSet-restore-chrome-contractdelta.md`. |
