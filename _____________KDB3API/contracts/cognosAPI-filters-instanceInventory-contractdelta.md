# Contract Delta: `cognosAPI.filters` Instance Inventory Boundary

> Thin-host-wrapper delta supporting collision-free filter-owner inventory.
> This file does not assign filter ownership or create a shared filter registry.

---

**Status:** `Approved CP-1 (contract text) — Implementation in progress — PO authorized 2026-07-15`
**Owner module / service:** `core/cognosAPI/filters`
**Type:** `thin host wrapper initial contract`
**Authoring AI:** GPT-5.6 Sol, 2026-07-15
**Reviewed by:** `three independent contract reviews + GPT-5.6 Sol final integral review, 2026-07-15; PO CP-1 text approved 2026-07-15`
**Consumed by:** `singleSelect-filterInstanceIdentity-contractdelta.md`
**Contract authority:** initial module contract for the pre-existing
`_KDB.cognosAPI.filters` thin wrapper; no parent module contract exists.

---

## 1. Purpose

`_KDB.cognosAPI.filters` exposes the Cognos PageContext filter objects and their
raw identity/value fields through one approved boundary. Filter owners can enumerate
all live instances without DOM discovery and can read `.d` and `.u` independently.

The wrapper remains host-thin: it does not classify KDB filter types, construct
`filterInstanceId`, own state, infer display values, map scopes to tabs or decide
restore policy.

## 2. Ownership And State

- This wrapper owns no `_KDB.state` subtree.
- It owns no `_KDB.runtime` registry.
- Cognos API objects returned by the wrapper may be retained only in a caller-owned
  runtime bucket.
- No new top-level `_KDB.*` key is introduced.
- Registration remains under `_KDB.cognosAPI.filters`.

## 3. Required Wrapper Surface

Existing methods remain compatible:

```js
getPageContextItemsArr(allowEmpty)
getAllGlobalFilterItems()
getFilterScope(filterItem)
getFilterSourceId(filterItem)
getFilterItemId(filterItem)
getFilterItemLabel(filterItem)
getFilterValues(filterItem)
replaceFilterContext(filterItem, values)
```

Add the symmetric raw enumeration helper:

```js
getAllPageContextFilterItems()
```

Contract:

- returns every item from `getPageContextItems()` whose raw `getScope()` is not
  `"global"`;
- returns an array, including `[]`;
- preserves host order but callers may not treat order as identity;
- does not swallow malformed item errors raised after enumeration.

Owners compose a serializable inventory record by calling the existing one-host-chain
wrappers separately. No snapshot convenience method may bundle multiple host chains
behind one `_KDB.cognosAPI.filters` function.

Normative behavior of each raw wrapper:

1. return only the corresponding raw host field;
2. clone value arrays and only their `d`/`u` fields;
3. never substitute `u` for missing `d` or `d` for missing `u`;
4. never trim, parse MUN segments or normalize scope suffixes;
5. throw the original/annotated error when a required host call fails;
6. represent a missing optional source field as `null`.

## 4. Value Write Contract

`replaceFilterContext(filterItem, values)` continues to accept Cognos value objects.

- A true pair is `{ d: displayValue, u: useValue }`.
- Empty selection is `[]`.
- CP-1 does not assume or probe use-only `{u}` capability.
- The wrapper does not create `d = u`.
- Owners first resolve a true pair. If unavailable, the single shared owner restore
  helper may supply a coded transport-only `d = u`, then must reread; that transport
  display never becomes confirmed owner display unless Cognos returns it as real
  `.d`.
- Successful write resolution does not prove the host retained the intended display;
  owners must reread the same item when their contract requires confirmation.

## 5. Lookup Discipline

The wrapper does not add label-only convenience lookup.

Owners enumerate and match:

- global: raw scope `"global"` plus `itemId`, with controlled itemName fallback;
- pageContext: normalized scope plus `itemId`, with controlled itemName fallback.

`getItemName()` alone is never sufficient when multiple live items match.

## 6. Readiness And Failure

Readiness waits, retries, timeouts, stale-run guards and reconcile diagnostics remain
owner behavior. The thin wrapper performs one immediate host chain per method.

The owner maps wrapper failures to explicit codes such as:

- `SINGLE_SELECT_RECONCILE_FAILED`;
- `SINGLE_SELECT_RECONCILE_TIMEOUT`;
- `SINGLE_SELECT_HOST_VALUE_READ_FAILED`;
- `SINGLE_SELECT_HOST_WRITE_FAILED`.

No empty catch or `console`-only failure path is introduced in new wrapper code.

## 7. AMD And File Constraints

- Keep one anonymous AMD `define` in `core/cognosAPI/filters.js`.
- Do not import feature modules into the Cognos boundary.
- Production `core/cognosAPI/filters.js` already exceeds the 150-line executable
  hard limit. Before adding behavior, split raw enumeration/snapshot logic into
  narrowly named files under `core/cognosAPI/filters/` and leave `filters.js` as
  thin surface wiring. Do not approve further growth of the existing oversized
  file and do not create a shared service.
- Dependencies are aliased and remain below the project import limit.

Planned responsibilities:

```txt
core/cognosAPI/
  filters.js
  filters/
    listGlobalFilterItems.js
    listPageContextFilterItems.js
    cloneFilterValues.js
```

## 8. Acceptance

1. One call can enumerate every global item.
2. One call can enumerate every non-global PageContext item.
3. Separate thin calls expose raw scope, itemId, itemName and independent `.d`/`.u`.
4. Two same-label items in different scopes remain separate objects.
5. Two same-label items in one scope remain separate when itemId differs.
6. Missing `.d` is returned as missing, not copied from `.u`.
7. No DOM or WBParameter path is used.
8. No state or runtime resource is owned by the wrapper.

## 9. Out Of Scope

- KDB filter classification and canonical ID construction;
- tab/scope mapping;
- owner reconcile lifecycle;
- display formatting;
- PDF consumption;
- persisted writeback schema;
- Cognos API object serialization.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-07-15 | `Proposed → Draft CP-1` | PO vastenburg | Boundary direction approved for contract drafting; production implementation remains blocked pending cross-review. |
| 2026-07-15 | `Draft CP-1 (blockers open) → Approved CP-1 (contract text)` | PO vastenburg | Master approval blockers closed via the canonical `singleSelect-filterInstanceIdentity-contractdelta.md` §16 decisions (incl. no assumed `{u}` capability / coded transport-only `d = u` + reread, §4). Contract text approved; separate production-start authorization was still required at this entry; build/atomic-tranche gates apply. |
| 2026-07-15 | `Approved CP-1 (contract text) → Implementation in progress` | PO vastenburg | Production implementation authorized and started under the approved boundary and tranche gates. |
