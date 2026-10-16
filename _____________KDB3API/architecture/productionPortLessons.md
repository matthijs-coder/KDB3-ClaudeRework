# Production Port Lessons

Practical lessons for promoting a module from `TEST` into production under `_____________KDB3API/KDB3`.

These notes are intentionally module-neutral. Use them as a checklist before asking an AI agent to port a new `TEST` module to production.

## Purpose

Porting is not only copying files. A `TEST` module often works because the harness provides paths, DOM mount points, CSS, config and mock host behavior that production does not provide in the same way.

Rule:

```text
Before porting, identify every harness assumption and replace it with the production equivalent.
```

Why: most promotion bugs come from implicit harness behavior, not from the module's local business logic.

## AMD And RequireJS Paths

Rule:

```text
Do not carry harness/baseUrl absolute module ids into production.
```

Check all `define([...])` dependencies after moving files. A path that works in `TEST` may fail in production because the module's relative location changed.

Required checks:

- use relative dependencies for siblings and nearby module internals;
- use production-root dependencies only when that is already the established local pattern;
- verify the resolved path from the final production file location;
- check browser console for RequireJS script errors and 404s.

Why: path bugs often look like missing behavior because the failed module never registers its API or effects.

## Config Ownership

Rule:

```text
Global production config belongs in `core/config`; feature modules may read it, but should not invent parallel global config roots.
```

Feature-local constants may stay inside the feature when they are not shared. Shared URLs, environment-specific values, asset roots and host selectors should be centralized.

Required checks:

- move production-wide config into `KDB3/js/core/config`;
- keep feature defaults close to the owning feature only when they are not global;
- avoid hard-coded TEST URLs, mock IDs, local folders or harness-only config in production files.

Why: copied config fragments drift quickly and make later module ports inconsistent.

## Assets And CSS

Rule:

```text
Production assets and stylesheets must be verified against the production extension path, including `./v1/ext/KDB3/...`.
```

CSS that works in a harness may be scoped to mock containers, local folders or temporary file names. Promotion must update selectors and stylesheet hrefs to production paths.

Required checks:

- add or update stylesheet entries through the production CSS config;
- verify hrefs use the production extension path pattern;
- remove harness/mock selector scopes unless production deliberately provides the same element;
- check browser network output for CSS, image and font 404s.

Why: visual regressions are often caused by unloaded CSS or selectors still scoped to TEST-only DOM.

## Host Selectors And DOM References

Rule:

```text
Stable host selectors belong under `_KDB.elements.selectors.host`; live DOM nodes belong under the owning module's runtime.
```

Do not store live DOM nodes inside `_KDB.elements` or under serializable state. `_KDB.elements.selectors.*` should describe how to find stable host elements; runtime refs should hold actual elements created or mounted during execution.

Required checks:

- centralize Cognos/host selectors under `_KDB.elements.selectors.host`;
- keep module selectors under the owning module only when they are feature-specific;
- store live DOM references under `_KDB.runtime.<owner>.domRefs` or another owner runtime field;
- do not place DOM nodes in `_KDB.state`, `_KDB.config` or `_KDB.elements`.

Why: selectors are configuration, but DOM nodes are runtime state with lifecycle and teardown requirements.

## Runtime Reference Shape

Rule:

```text
Use the runtime shape that the owning controller/effects already define; do not guess nested ref paths during promotion.
```

When wiring production mount behavior, confirm where the owner writes each runtime value before reading it elsewhere. For example, a mount target may be stored at `_KDB.runtime.<owner>.mountTargetEl`, while created child nodes live under `_KDB.runtime.<owner>.domRefs`.

Required checks:

- read the controller mount method before changing effects;
- verify every runtime read has a matching runtime write;
- verify teardown clears the same refs that mount/effects create;
- avoid adding compatibility aliases unless production already shipped with both shapes.

Why: a single wrong runtime path can silently skip DOM mounting while leaving state changes looking correct.

## `KDB.js` Promotion Boundary

Rule:

```text
`KDB.js` changes should be wiring-only unless the user explicitly approves broader bootstrap behavior.
```

Typical allowed changes are adding orchestrator dependencies, registering a feature API, mounting it in the agreed order and destroying it in the reverse order.

Required checks:

- keep feature behavior inside the feature owner;
- keep services out of `KDB.js` unless the tranche explicitly adds that service;
- preserve agreed register, mount and destroy order;
- do not seed feature state from `KDB.js` after the feature owner is registered.

Why: `KDB.js` should remain bootstrap glue, not a place where feature logic accumulates.

## Browser Verification

Rule:

```text
Every production promotion needs a browser CP-2 check, not only static file inspection.
```

Minimum browser checks:

- no RequireJS module load errors;
- no network 404s for JS, CSS or assets;
- expected `_KDB.api.<module>` exists;
- expected `_KDB.state.<module>` exists and changes after public API actions;
- expected `_KDB.runtime.<module>` refs are set after mount and cleared after destroy;
- expected DOM appears in the production host, not only in TEST;
- console has no new module-specific errors.

Why: TEST can prove local behavior, but only production browser checks prove extension pathing and host integration.

## Common Failure Modes

- A `define([...])` dependency still assumes TEST `baseUrl`.
- CSS hrefs still point to harness paths or old file names.
- Selectors still target `#mock-*` elements.
- Production config is duplicated inside a feature instead of read from `core/config`.
- A live DOM element is stored in `_KDB.elements` or `_KDB.state`.
- Effects read a runtime path that the controller never writes.
- `KDB.js` grows feature behavior instead of only wiring the owner API.
- A module appears inactive because RequireJS failed before the API registered.

## Prompt Checklist For Executing AI

Use this prompt when asking an AI agent to port a `TEST` module into production:

```text
Port the module from `TEST` to production under `_____________KDB3API/KDB3`.

Before editing, read `_____________KDB3API/architecture/productionPortLessons.md` and apply it as a checklist.

Requirements:
- Do not copy harness/baseUrl AMD module ids blindly. Re-resolve every `define([...])` dependency from the final production file location.
- Move or read shared production config through `KDB3/js/core/config`; do not create parallel global config inside the feature.
- Verify production CSS and asset paths use `./v1/ext/KDB3/...` where applicable.
- Centralize stable host selectors under `_KDB.elements.selectors.host`; keep live DOM refs under `_KDB.runtime.<owner>`.
- Match runtime reads to runtime writes. Read controller mount/destroy code before changing effects.
- Keep `KDB.js` changes wiring-only: dependency registration, module registration, mount order and destroy order. Ask before adding non-wiring behavior.
- Remove TEST-only selectors, mock IDs, local folders and harness comments from production files.
- After implementation, perform browser CP-2 verification: RequireJS errors, API/state/runtime presence, DOM mount, teardown, CSS/assets and network 404s.

Report any assumption that cannot be verified from code before proceeding.
```
