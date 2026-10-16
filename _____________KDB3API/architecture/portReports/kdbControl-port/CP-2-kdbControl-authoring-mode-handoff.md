# CP-2 handoff: kdbControl authoring-mode (sandbox)

## 1. Tranche

**kdbControl authoring-mode sandbox** — authoring state en feiten-events in `TEST/kdbControl-port/`, met harness ter verificatie.

## 2. CP-2 status

**Groen** — implementatie voldoet aan de overeengekomen acceptatie voor deze tranche.

## 3. Oplevering

- **Authoring owner skeleton:** `_KDB.state.authoring.isAuthoring` wordt alleen via de authoring-module gezet; `_KDB.api.authoring` biedt `mount`, `destroy`, `dispatch`, `getState`.
- **State / read selector:** gepubliceerde consumer-read gaat via `readIsAuthoring(_KDB)` (geen extra granular reads op `_KDB.api.authoring`).
- **Fact-events:** na boolean-commit `authoring:entered` / `authoring:exited` met payload `{ isAuthoring, source }` (`source` uit toegestane enum).
- **kdbControl consumer:** initiële class-sync op mount, subscriptions op de feiten-events, togglen van `kdb-control--authoring` op de shell-root, cleanup bij `kdbControl.destroy()`.
- **Harness:** scenario-knoppen (mount, enter, exit, dubbele enter, emit na destroy), logging en visuele outline voor authoring-class.

## 4. Acceptatiechecks

| Check | Verwacht gedrag |
|--------|------------------|
| Mount | `readIsAuthoring` / authoring-state **false** na normale bootstrap. |
| Initiële class | `#kdb-control-root` heeft **geen** `kdb-control--authoring` direct na kdbControl-mount. |
| Enter | Dispatch `authoring/enter` (geldige `source`): state **true**, feit-event, class **aan**. |
| Exit | Dispatch `authoring/exit`: state **false**, feit-event, class **uit**. |
| Dubbele enter | Tweede enter terwijl al **true**: **geen** tweede emit (zelfde boolean → geen transitie). |
| Destroy | kdbControl `destroy`: subscriptions weg; latere bus-emit **geen** kdbControl DOM-sync (geen stale handlers). |
| Geen Cognos/dashboard-flag als waarheid | Canoniek: `_KDB.state.authoring`; geen `dashboard.isAuthoring` als bron in mock. |
| Geen granular `_KDB.api.authoring` reads | Consumers gebruiken `readIsAuthoring(_KDB)`; geen extra getters op de authoring-API. |

## 5. Afwijkingen (bewust)

- **Ongeldige dispatch:** `console.error` + early return; **geen** reducer-actie `authoring/error` (per besluit CP-2; niet toevoegen in vervolg zonder nieuwe CP).
- **`getState()`:** shallow clone / platte snapshot is voldoende zolang de authoring-slice vlak blijft (`isAuthoring`).

## 6. Open punten

- **Geen blokkerende issues** voor deze tranche.
- **Geen geautomatiseerde browser-run** in CI voor dit port; verificatie via gebruiker / harness in de browser.

## 7. Aanbevolen vervolgtranche

- **Gedrag koppelen:** toolbox / header-footer (of andere consumers) laten aansluiten op authoring-feiten na productbeslissing, **of**
- **Promotie:** sandbox-patroon naar echte `KDB3/js/**` target pas na expliciete beslissing (buiten scope huidige CP-2).

---

*Report gegenereerd voor CP-2 handoff; geen gedrags- of contractwijzigingen in dit document.*
