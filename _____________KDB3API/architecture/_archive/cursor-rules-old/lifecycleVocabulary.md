# Lifecycle vocabulary

Use these canonical lifecycle terms consistently across the project.

Format: `<term>` — `<meaning>` — `<regions where used>`

## Approved terms

- `active` — currently in use — general; default for in-use entities
- `inLaunchpad` — moved to launchpad rather than removed — widgets, tabs
- `removed` — removed from active use but state retained — filters, widgets
- `pending` — waiting on async work to complete — general
- `loading` — actively loading initial data/content — tables, widgets
- `refreshing` — reloading while previous usable state/data is still available — widgets, tables, filters, trees
- `initializing` — being set up; dependencies, config or API handles are not ready yet — dashboard, extensions, controllers, adapters, widgets
- `ready` — initialized and available for use; no current load operation — dashboard, extensions, controllers, adapters, widgets, filters
- `stale` — state/data exists but no longer matches the latest controlling inputs — widgets, tables, filters, trees
- `empty` — successful terminal state with no data/options/items — tables, widgets, filters, trees
- `blocked` — cannot proceed because a required prerequisite is missing — filters, widgets, buttons, prompt flows, controllers
- `dirty` — local state changed but not yet applied or persisted — filters, parameter sets, settings, widgets
- `error` — failed terminal state — general
- `idle` — no activity — drag, observers
- `disposed` — intentionally torn down; technical resources released and state no longer usable — observers, subscriptions, controllers, adapters

## Usage rules

Use lifecycle terms only for lifecycle/runtime state.

Do not use lifecycle terms for unrelated dimensions such as visibility, selection, validation, permissions, expansion state or enablement.

Prefer separate state fields when needed:

```js
widget.lifecycle = "active";      // active | inLaunchpad | removed
widget.runtime = "ready";         // initializing | loading | refreshing | ready | stale | empty | blocked | error
widget.visible = true;
widget.enabled = true;
```

Do not invent new lifecycle terms inside implementation code.

If a region needs a lifecycle term not listed here, stop and ask for approval before adding it.

## How to add a term

1. A region needs a lifecycle term not listed here.
2. Stop and ask the user for approval.
3. On approval, append the term, meaning and allowed region(s) to this file.
4. Update the region's orchestrator comment block declaring its allowed lifecycle terms.

## Synonym ban

Use the canonical term. Do not use these synonyms as lifecycle terms.

- `removed` — not `deleted`, `gone`, `dead`, `archived`
- `active` — not `live`, `current`, `enabled`
- `idle` — not `inactive`, `waiting`
- `pending` — not `waiting`
- `ready` — not `loaded`, `complete`, `done`
- `refreshing` — not `reloading`
- `initializing` — not `booting`, `starting`
- `stale` — not `outdated`, `invalid`
- `empty` — not `blank`, `none`, `noData`
- `blocked` — not `disabled`, `locked`
- `dirty` — not `changed`, `modified`
- `disposed` — not `destroyed`, `killed`

Note: `enabled`, `visible`, `selected`, `valid`, `expanded`, `collapsed`, `mounted`, `rendered`, `attached` and `detached` may be valid separate state fields, but they are not lifecycle terms.

## Region guidance

### Widgets

Allowed lifecycle/runtime terms:

```txt
active
inLaunchpad
removed
initializing
loading
refreshing
ready
stale
empty
blocked
error
```

### Filters

Allowed lifecycle/runtime terms:

```txt
active
removed
initializing
loading
refreshing
ready
stale
empty
blocked
dirty
error
```

### Tables and data providers

Allowed lifecycle/runtime terms:

```txt
initializing
loading
refreshing
ready
stale
empty
blocked
error
```

### Observers and subscriptions

Allowed lifecycle/runtime terms:

```txt
idle
active
error
disposed
```

### Controllers and adapters

Allowed lifecycle/runtime terms:

```txt
initializing
ready
pending
blocked
error
disposed
```

### Drag operations

Allowed lifecycle/runtime terms:

```txt
idle
active
error
```
