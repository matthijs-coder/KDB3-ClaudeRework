# kdbControl — authoring mode (CP-1 contractdelta)

**Status:** CP-1 **akkoord** (contract only; geen implementatie in dit traject).  
**Datum:** 2026-05-13 · **Bijgewerkt:** CP-1 besluiten gesloten — `source`-enum, selector-pad, runtime subscription keys.  
**Relatie:** wijzigt / verfijnt authoring-aspect t.o.v. `kdbControl.md` Q3 (**superseded**); align met `module-public-api.mdc`, `events.mdc`, `runtime.mdc`, `stateOwnership.md`, `architecture/eventSubscribe.md`, `architecture/openDesignCandidates.md` (authoring-candidate verwijderd).

---

## 1. Purpose

Authoring-modus (Cognos dashboard authoring) wordt centraal gemodelleerd buiten `kdbControl`. Het **`authoring`-eigenaar** houdt **`_KDB.state.authoring.isAuthoring`** vast. Cognos/bootstrap **schrijft niet rechtstreeks** in state maar roept **`_KDB.api.authoring.dispatch(...)`** aan. `kdbControl` reageert alleen op **feiten** (events) en **granulaire initial read** via gepubliceerde selectors, en past **eigen DOM** aan (één CSS-modifier). Legacy visuele classnamen worden niet overgenomen.

---

## 2. Ownership / state path

| Onderdeel | Eigenaar |
|-----------|-----------|
| `_KDB.state.authoring.isAuthoring` | **`authoring`-module** (canonical writer) |
| `_KDB.runtime.authoring` | `authoring`-module (eigen runtime; niet voor consumer-subscription handles) |
| `_KDB.api.authoring` | Dispatch-style feature surface: **`mount`**, **`destroy`**, **`dispatch`**, **`getState`** alleen (zie §3) |
| Cognos UI → authoring | **`_KDB.services.cognos` / bootstrap adapter** (of gelijkwaardige init-laag): leest host UI, roept **`_KDB.api.authoring.dispatch(...)`** aan — geen directe state-mutatie buiten de owner |

**State shape (minimum):**

```txt
_KDB.state.authoring = {
  isAuthoring: boolean
}
```

**Verboden / conflict:** geen canonieke authoring-boolean onder `_KDB.state.kdbControl`. **`_KDB.state.kdbControl.authoringMode`** (of gelijkwaardig oud subsysteem) is **geen owner** van deze waarheid — bij adoptie expliciet als **niet-owner / legacy conflict** markeren in follow-up docs (zie §10).

**Ownership-map:** subtree `_KDB.state.authoring` → canonical writer **`authoring`** module (vastgelegd in `stateOwnership.md` Full Ownership Map).

---

## 3. Public API (`_KDB.api.authoring`)

- **Stijl:** dispatch-style feature-module conform `module-public-api.mdc`.
- **Toegestane methoden op `_KDB.api.authoring`:** uitsluitend **`mount`**, **`destroy`**, **`dispatch`**, **`getState`** — geen andere publieke methoden zonder afwijkingsmotivatie in module-contract.
- **Verboden op deze surface:** geen **`getAuthoringState()`** en geen andere **granulaire read-**methoden op `_KDB.api.authoring`.
- **`getState()`:** alleen **volledige read-only snapshot** van `_KDB.state.authoring` (en eventueel andere door `authoring` eigendom toegevoegde keys in dat contract); geen substituut voor `readIsAuthoring` in consumer-mount-paden als granulaire read bedoeld is.
- **Vreemde modules** muteren `_KDB.state.authoring` niet direct.

### 3.1 Granulaire reads (selector registry)

- **CP-1 — canonieke selector-export:** granulaire read voor `isAuthoring` via **`readIsAuthoring(_KDB)`**, gedefinieerd/geëxporteerd vanuit **`authoring/state/selectors.js`** (authoring-module selector registry; één publieke entry-naam voor deze read).
- **Consumers** (o.a. `kdbControl`) gebruiken voor mount-time **initial sync** van de boolean uitsluitend **`readIsAuthoring(_KDB)`** (import vanaf het gepubliceerde pad van de authoring-module; geen diepe interne imports buiten het door `module-public-api.mdc` toegestane public surface).

---

## 4. Dispatch actions

**Action `type`**-waarden (slash-actions, reducer/effects):

- **`authoring/enter`** — `payload: { source: SourceEnum }`
- **`authoring/exit`** — `payload: { source: SourceEnum }`

**CP-1 — gesloten `source` enum (`SourceEnum`):** `"cognos-ui"` \| `"api"` \| `"bootstrap"`.  
Eigenaar valideert dispatch-payloads tegen deze set; events en catalog (`eventSubscribe.md`) gebruiken dezelfde waarden in payloads.

---

## 5. Events + payload

Na **succesvolle state-commit** van `isAuthoring` emitteert de eigenaar fact-events via `_KDB.events`:

| Event | Confirmation point |
|-------|---------------------|
| `authoring:entered` | `isAuthoring: false → true` gecommit |
| `authoring:exited` | `isAuthoring: true → false` gecommit |

**Event-name constants — één canonieke home (geen tweede):**  
`KDB3/js/core/events/authoringMode.js` voor de string-constanten van **`authoring:entered`** en **`authoring:exited`** (cross-cutting facts; subscribers o.a. `kdbControl` importeren vanaf **core/events**, niet vanuit `authoring/events/` als tweede canonieke home voor dezelfde bus-namen).  
`authoring/events/` mag hoogstens **module-local glue** of payload-hulp bevatten, **niet** dezelfde event-name constanten dupliceren.

**Payload (JSON-serialiseerbaar, geen DOM/Cognos-referenties):**

```js
{
  isAuthoring: boolean,
  source: "cognos-ui" | "api" | "bootstrap"
}
```

(`isAuthoring` steeds `true` bij `entered`, `false` bij `exited`; expliciet voor tests/logging. `source` is dezelfde enum als in §4.)

**Catalog:** `architecture/eventSubscribe.md` — emitter **`authoring`**, payload syncen met bovenstaande; subscribers o.a. **`kdbControl`**. **Teardown (kdbControl):** uitsluitend **`kdbControl.destroy()`** — wist de authoring-gerelateerde subscription keys **`authoringEntered`** en **`authoringExited`** onder `_KDB.runtime.kdbControl.subscriptions` (geen losse unsubscribe buiten `destroy` voor dit contract).

---

## 6. kdbControl consumer responsibilities

- **Consumer only:** geen authoring-state ownership; **geen** `_KDB.state.kdbControl.authoringMode` als bron van deze boolean.
- **`mount`:** (1) **initial sync** via **`readIsAuthoring(_KDB)`**; (2) **`kdb-control--authoring`** op eigen root zetten/verwijderen naar aanleiding van die read; (3) **subscribe** op `authoring:entered` / `authoring:exited` en class synchroniseren met payload/event.
- **Handlers:** alleen **eigen DOM** en eigen runtime; **geen** writes naar `_KDB.state.authoring` of andere vreemde subtrees.
- **Geen** `KDB_authoringMod` op productie-DOM onder deze delta.

---

## 7. Runtime / teardown

- Unsubscribe-functies van `_KDB.events.subscribe` voor authoring-events: opslaan onder **`_KDB.runtime.kdbControl.subscriptions`** met **CP-1 vaste keys:** **`authoringEntered`**, **`authoringExited`** (afgestemd op `kdbControl.md` §3 runtime-tabel).
- **`kdbControl.destroy()`:** alle authoring-gerelateerde subscriptions unsubscriben en runtime-keys wissen; geen handles buiten `_KDB.runtime.kdbControl.subscriptions` (`runtime.mdc`).

---

## 8. CSS class impact

- **Enige** authoring-indicator op nieuwe kdbControl-shell: **`kdb-control--authoring`** op het kdbControl-root element (conform framework-DOM-contract).
- **`KDB_authoringMod`:** niet gebruiken onder deze delta.

---

## 9. Out of scope

- Implementatiecode en Cognos-internals.
- Overige consumers (header, widgets, …) behalve vastleggen dat zij **dezelfde events** en/of selectors kunnen gebruiken zonder `kdbControl`.
- Payload-uitbreidingen (correlation ids, timestamps) tot na CP-1.

---

## 10. CP-1 doc-sync (uitgevoerd tegen deze delta)

De volgende architectuur- en contractbestanden zijn met CP-1 gesynchroniseerd:

1. **`kdbControl.md`:** Q3 gemarkeerd als **superseded**; authoring-waarheid buiten kdbControl; `kdbControl` **consumer only** voor authoring (zie User decisions + verwijzing naar dit document).
2. **`stateOwnership.md`:** **`_KDB.state.authoring`** → canonical writer **`authoring`**.
3. **`eventSubscribe.md`:** `authoring:entered` / `authoring:exited` — emitter **`authoring`**, confirmation point **`_KDB.state.authoring.isAuthoring`**, payload conform §5; teardown voor kdbControl-subscriptions via **`kdbControl.destroy()`**.
4. **`openDesignCandidates.md`:** item “authoringMode dashboard-level module” **verwijderd als open candidate** — vervangen door verwijzing naar CP-1 / deze delta (**adopted**).

**Niet-owner / legacy:** `_KDB.state.kdbControl.authoringMode` (of gelijkwaardig) blijft **geen** canonieke bron van `isAuthoring`; dubbele waarheid is verboden (zie §2).

---

## 11. CP-1 besluitenlog (gesloten)

| Besluit | Waarde |
|--------|--------|
| `source` enum | `"cognos-ui"`, `"api"`, `"bootstrap"` |
| Selector voor granulaire read | `authoring/state/selectors.js` — **`readIsAuthoring(_KDB)`** |
| `kdbControl` runtime subscription keys | `authoringEntered`, `authoringExited` (teardown: `kdbControl.destroy()`) |
