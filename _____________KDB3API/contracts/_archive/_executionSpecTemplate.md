# Execution Spec: `<moduleName>` (`<phase or iteration>`)

> Template for a per-module execution spec handed to a less-capable AI ("cheap AI") that produces implementation files after a module contract has been approved.
>
> Copy this file to `_____________KDB3API/contracts/<moduleName>-<phase>-execution-spec.md`. Fill every section concretely. **The execution spec must be exhaustive**: a less-capable AI executes it mechanically and is not expected to make architectural decisions. Architectural decisions live in the contract, not here.
>
> An execution spec is required whenever Phase 2 (skeleton or implementation) is delegated to a different AI than the contract author. For solo work by the contract author, the contract alone may be enough.

---

**Status:** `Draft` | `Ready for execution` | `Executed` | `Reviewed` | `Frozen`
**Module / contract:** `_____________KDB3API/contracts/<moduleName>.md`
**Phase:** `<skeleton | full port | extension>`
**Authoring AI:** `<agent name + date>`
**Executing AI:** `<agent name + date when known>`
**Reviewer:** `<user / reviewer>`

---

## Section A. Pre-flight read list

> The executing AI **must** read each file below in order, **before** producing any output file. After reading, the executing AI **must echo back a one-sentence summary of each rule** (R6 enforcement). If a summary is missing or wrong, execution stops; the AI re-reads and retries.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — summary: `<one sentence>`
2. `_____________KDB3API/.cursor/rules/state.mdc` — summary: `<one sentence>`
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — summary: `<one sentence>`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — summary: `<one sentence>`
5. `_____________KDB3API/.cursor/rules/events.mdc` — summary: `<one sentence>`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — summary: `<one sentence>`
7. `_____________KDB3API/.cursor/rules/naming.mdc` — summary: `<one sentence>`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — summary: mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — summary: `<one sentence>`
10. `_____________KDB3API/.cursor/rules/amd.mdc` — summary: `<one sentence>`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — summary: `<one sentence>`
12. `_____________KDB3API/contracts/_template.md` — summary: `<one sentence>`
13. `_____________KDB3API/contracts/<moduleName>.md` — summary: `<one sentence>`
14. This execution spec itself.

The executing AI's first output **must** be the 14 echoed summaries as a numbered list. Only after the user/reviewer accepts the echo (manually or via supervising AI) does file creation begin.

---

## Section B. Folder tree

> Exact paths to create. Use the order listed; the cheap AI creates folders top-down and files in the order they appear under each folder.

```
<root>/
  <module>/
    <file 1>
    <subfolder>/
      <file 2>
  <harness or sibling>/
    ...
```

Any conditional file (depends on a contract Q-decision) is annotated `(conditional on Q<n>: <decision summary>)`.

---

## Section C. Per-file specifications

> One subsection per file from Section B, in creation order. **Every file** carries a `Rules to apply` line citing the relevant `.mdc` rules with one-line summaries (R5 enforcement). The cheap AI must verify each `Rules to apply` line is satisfied before moving on.

### Template per file

````
#### `<relative path>`

- **Role**: `<orchestrator | controller factory | service factory | adapter factory | reducer | selector | writer | view builder | event constants | harness | mock | ...>`
- **Lines**: target `<n>` (hard limit per `feature-structure.mdc`).
- **AMD imports** (deps array, literal strings, in order):
  - `"<path 1>"`
  - `"<path 2>"`
- **Factory parameters** (underscore-prefixed only on boundary inputs per `naming.mdc`):
  - `_<dep1>`
  - `_<dep2>`
- **Factory-scope named helpers** (optional, declared at AMD factory scope, **never** inside the entry function):
  - `function <helperName>(<args>) { /* one-line purpose */ }`
- **Entry function**:
  - Name: `<__orchestrator | __controller | createKdbControlController | ...>`
  - Parameters: `<list>`
  - Body steps (in order):
    1. `<step>`
    2. `<step>`
- **Return value**: `<entry function | controller object | reducer fn | constants object | ...>`
- **Rules to apply** (cheap AI must satisfy each before completing this file):
  - `amd.mdc` — full-compact `define([...], function (...) { ... })`; named entry function and helpers at AMD factory scope only; no inline subfunctions inside the entry function, callbacks or return path.
  - `naming.mdc` — `<casing>`; underscore prefix on boundary inputs only.
  - `feature-structure.mdc` — file fits the canonical folder role (`<folder>/`); size within the target band; entry-function name matches the role suffix.
  - `<additional rules from the list below as applicable>`
````

### Required `Rules to apply` lines by role

The author of the execution spec **must** include the matching lines per role. The cheap AI **must** verify each line is satisfied before declaring the file done. Missing rules in this section is itself a spec defect.

| Role | Required rules to apply (in addition to amd / naming / feature-structure) |
|---|---|
| Module orchestrator (`__orchestrator<Module>.js`) | `kdb-object.mdc` (registers `_KDB.api.<module>` or `_KDB.services.<service>`); thin orchestrator (no business logic). |
| Controller factory (`create<Module>Controller.js`) | `module-public-api.mdc` (single dispatch surface, no granular reads, no mixed shape); `state.mdc` (canonical writer is the reducer); `runtime.mdc` (initialize `domRefs`, `listeners`, `subscriptions`, `pendingPromises` in `mount`; **unsubscribe `subscriptions`, abort `listeners[*]`, then null the runtime in `destroy`**); `error-handling.mdc` (**try/catch around `mount` and `destroy` bodies**; on catch dispatch `<module>/error` with `errorCode`+`errorMessage`; `console.error("[<module>.<phase>]", err)`). |
| Service factory (`create<Service>Service.js`) | `module-public-api.mdc` (named methods, optional internal dispatch); `state.mdc` (canonical writer for service-owned subtree); `runtime.mdc` (cleanup path required); `error-handling.mdc` (try/catch at public method boundaries). |
| Adapter factory (`create<Adapter>Adapter.js`) | `module-public-api.mdc` (local factory, injected); `error-handling.mdc` (try/catch at host-call boundaries); no `_KDB.api` / `_KDB.services` registration unless explicit. |
| Reducer (`state/create<Module>Reducer.js`) | `state.mdc` (pure function, no side-effects, no foreign-state writes); `naming.mdc` (action types: slash-style `<module>/<actionName>`). |
| Selectors (`state/selectors.js`) | `state.mdc` (read-only; published selector registry per `module-public-api.mdc`); pure functions. |
| Writers (`state/writers/<verb><Noun>.js`) | `state.mdc` (callable only by the reducer); no public surface. |
| View builder (`view/build<Thing>.js`) | `dom.mdc` (selectors from `_KDB.elements.selectors.<module>`; live refs in `_KDB.runtime.<module>.domRefs`; Builder/Placer/Mutator triad). |
| Effects orchestrator (`effects/__orchestratorEffects.js`) | `error-handling.mdc` (try/catch at external-API boundaries; AbortController for async); `events.mdc` (fact-event emission at documented confirmation points only). |
| Event constants (`events/eventNames.js`) | `events.mdc` (canonical home for events emitted by this module); `naming.mdc` (colon-style for events, slash-style for actions). |
| Harness HTML | none of the production rules apply; lives outside `KDB3/js/**`. |
| Harness JS | `amd.mdc` harness-exception; AMD-aware shim if loading production AMD modules. |
| Mock adapter | matches the shape used by the production code; no real Cognos calls. |

---

## Section D. Reducer behavior table

> One row per action type. Reducer is pure; effects live elsewhere.

| Action type | Trigger | Reducer effect (state shape change) | Lifecycle transition |
|---|---|---|---|
| `<module>/init` | `mount()` | `<...>` | `idle → mounted` |
| `<module>/destroy` | `destroy()` | `<...>` | `<current> → disposed` |
| `<module>/error` | catch in `mount`/`destroy` | merge `{ lifecycle: "error", errorCode, errorMessage }` | `<current> → error` |
| `<module>/<other>` | `<dispatch site>` | `<...>` | `<from> → <to>` or none |

---

## Section E. Published selectors

> One row per selector. Each reads from a specific state subtree; nothing else.

| Selector | Reads | Returns |
|---|---|---|
| `read<Name>` | `state.<path>` | `<shape>` |

---

## Section F. Public API wiring

> One block per surface. For feature modules: `_KDB.api.<module>`. For shared services: `_KDB.services.<service>`. Adapters: injected, no global surface.

- Surface: `<path>`
- Methods exposed: `<list>`
- `_KDB.runtime.<module>` initialization: `<bucket list>`
- `_KDB.state.<module>` initialization: `<initial state path>`

---

## Section G. Harness HTML spec

> Full `<!doctype html>` content. RequireJS config (or chosen loader) with explicit `paths` mapping. Mock DOM elements. Debug-log container. Control buttons (mount / destroy / scenario triggers).

```
<!doctype html>
<html>...</html>
```

---

## Section H. Harness JS spec

> Mount sequence. Mock `_KDB` construction. Lifecycle and event logging to debug-log. Cleanup path.

---

## Section I. Mock extensions

> List every shape the production code touches that the mock must provide as a stub:
>
> - `cognosAPI.<theme>.<method>` — stubs returning `Promise.resolve(...)` or no-op.
> - `data.<...>` — empty object or fixture.
> - `state.<...>` — initial value.
> - `elements.<...>` — `() => documentElement` stubs.
> - `events` — in-memory `subscribe`/`emit`.

---

## Section J. Acceptance criteria (self-verification before reporting back)

> The executing AI **must** self-verify all of the following before declaring the spec executed:

1. Every file from Section B exists or is documented as omitted with the Q-decision reference.
2. Every file matches its `Per-file specification` in Section C, including the `Rules to apply` line.
3. Every file uses the full-compact AMD `define([...], function (...) { ... })` shape (where applicable).
4. No file exceeds the line limit declared in its spec.
5. No file contains inline subfunction definitions inside the entry function, callbacks or return path.
6. No file imports anything outside the module's own folder, declared adapter folders, or the harness folder.
7. No forbidden tree was read or modified (see Section K).
8. The reducer is pure; all side-effects live in effects or controller `mount`/`destroy`.
9. `mount` and `destroy` wrap their bodies in `try/catch`; on catch they dispatch `<module>/error` with `errorCode` + `errorMessage` and `console.error("[<module>.<phase>]", err)`.
10. `destroy` unsubscribes every entry in `_KDB.runtime.<module>.subscriptions`, calls `.abort()` on every entry in `_KDB.runtime.<module>.listeners`, then sets the runtime to `null`.
11. All event-name constants live in the emitter's canonical home; no string literal duplication.
12. Reporting back: the executing AI submits a checklist of file paths, line counts, deviations (with motivation), and the 14 echoed summaries from Section A.

---

## Section K. Forbidden actions

> The executing AI **must not** do any of the following:

- Modify any `.mdc` file under `_____________KDB3API/.cursor/rules/`.
- Modify `_____________KDB3API/contracts/_template.md` or `_executionSpecTemplate.md`.
- Modify the approved module contract `_____________KDB3API/contracts/<moduleName>.md`.
- Read or modify legacy trees: `TEST/dashboard/`, `_______KDB3/`, `_______REDESIGN2/`, `_______LAATSTEORIGINAL/` (unless the spec explicitly lists a path inside one of these as a read input for a specific step).
- Write CSS, tests or README files unless the spec explicitly requests them.
- Commit, push, or change git config.
- Invent behavior beyond what the spec describes; deviation requires stopping and reporting.
- Skip Section A pre-flight reads or proceed without the 14 echoed summaries.

---

## Section L. Reporting template (for the executing AI)

> The executing AI's final response must include all of the following, in this order:

1. **Pre-flight echo** — 14 numbered rule/file summaries from Section A.
2. **File checklist** — table of every path created with line count and "matches spec | deviation".
3. **Deviations** — bullet list of any deviation, each with: file path, deviation, motivation, rule consulted.
4. **Self-verification** — explicit pass/fail per criterion in Section J.
5. **Open questions for reviewer** — anything the spec did not cover that required improvisation, framed as a question.

---

## Section M. Reviewer handoff

> The supervising AI (or human reviewer) does the following before declaring the phase complete:

1. Verify the 14 echoed summaries are present and roughly correct.
2. Read every file created.
3. Run `ReadLints` on all `.js` files.
4. Cross-check each file against the `Rules to apply` line in Section C.
5. Decide: accept, fix-spec for another iteration, or escalate.

---

> End of execution-spec template. Remove all `<placeholder>` markers in the final filled-in document; leave headers and table shells intact.
