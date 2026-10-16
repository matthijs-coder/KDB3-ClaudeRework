# kdbControl — toolbox header/footer controls (CP-1 contractdelta)

**Status:** CP-1 **approved** (contract resolved; geen implementatie in dit traject).  
**Datum:** 2026-05-13 · **Besluiten:** gesloten — zie §2.  
**Relatie:** verfijnt `kdbControl.md` (control surface vs chrome owners), align met `stateOwnership.md`, `module-public-api.mdc`, `events.mdc`, `state.mdc`, `runtime.mdc`, `dom.mdc`; module-contracten: [header.md](./header.md), [footer.md](./footer.md).

---

## 1. Architecture decisions (closed)

| ID | Besluit |
|----|---------|
| **H1** | Aparte modules **`header`** en **`footer`**. Geen gezamenlijke **`headerFooter`** module/service. |
| **H2** | **`kdbControl`** blijft **alleen** control surface: **geen** `_KDB.state.header` / `_KDB.state.footer` writes; **geen** foreign state writes. |
| **H3** | **`header`** eigenaar van `_KDB.state.header`, header DOM/mount, subtitle/title-edit **state** (zie `header.md`). |
| **H4** | **`footer`** eigenaar van `_KDB.state.footer`, footer DOM/mount; **mag** afhangen van header-**status** (guards). |
| **H5** | Toolbox-knoppen: **directe** public API dispatch naar bekende owners — **geen** request-events voor deze commands (`events.mdc` conflict: **stop** en escaleer alleen als polymorphic owner/boundary later blijkt). |
| **H6** | Fact-event **`header:confirmedChanged`** (emitter: **`header`**) voor consumers (o.a. **`footer`**) na **bevestigde** header state + render sync — zie `header.md` §7. |

---

## 2. CP-1 resolved decisions (gesloten)

| # | Onderwerp | Besluit |
|---|-----------|---------|
| **1** | **`source` enum** | **`"kdbControl"` \| `"api"` \| `"bootstrap"`** op alle relevante `header` / `footer` dispatches en in **`header:confirmedChanged`** payload (`source`). |
| **2** | **Header lifecycle / `status`** | **`idle`** = nooit geplaatst/geactiveerd; **`active`** = zichtbaar/gemount; **`removed`** = eerder actief en bewust verwijderd. **`header/toggle`:** `idle` \| `removed` → `active`; `active` → `removed`. Details `header/show` / `header/hide`: [header.md](./header.md) §5. |
| **3** | **kdbControl toolbox UI** | **Alleen pure read-sync** uit gepubliceerde **`header`** / **`footer`** selectors; **geen** mirror-state onder **`_KDB.state.kdbControl`** voor header/footer (ook geen `toolbox.*` cache van die waarheid). |
| **4** | **`header:confirmedChanged` payload** | **`{ status, subtitleStatus, titleText, subtitleText, source }`** alleen; **geen** `revision` in CP-1. |
| **5** | **Footer guard + header → removed** | Footer kan **niet `active`** zijn als header **`idle`** of **`removed`**. Als footer **eerder `active` was** en header wordt **`removed`:** `footer.status = "removed"` + footer-**DOM weg**. Als footer **nooit `active` was:** `footer.status` blijft / wordt **`idle`**. |
| **6** | **Footer lifecycle / `status`** | Zelfde drie waarden en betekenis als header: **`idle` \| `active` \| `removed`**. `footer/toggle` spiegelt header-toggle **mits** header `active` is — zie [footer.md](./footer.md) §5–6. |

---

## 3. kdbControl toolbox — UI vs effect

| Concern | Owner |
|---------|--------|
| Controls blijven in **kdbControl** UI (toolbox panel / primitives). | `kdbControl` |
| State van header/footer chrome, mount slots, titel/subtitel tekst & edit. | `header` / `footer` |
| Effect van gebruikersacties op chrome. | **`_KDB.api.header.dispatch`** / **`_KDB.api.footer.dispatch`** |

**kdbControl reducer:** mutates **only** `_KDB.state.kdbControl.*`. Toolbox controls **reflect** header/footer via **selectors + DOM sync** (read path); **no** `_KDB.state.kdbControl` fields storing header/footer truth (§2 item **3**).

---

## 4. Verplichte dispatch-wiring (toolbox)

Exacte calls vanuit kdbControl binders (conceptueel; geen code in dit traject):

| UI control (Duits label — sandbox) | Actie |
|-----------------------------------|--------|
| Kopfzeile toggle | `_KDB.api.header.dispatch({ type: "header/toggle", payload: { source: "kdbControl" } })` |
| Fußzeile toggle | `_KDB.api.footer.dispatch({ type: "footer/toggle", payload: { source: "kdbControl" } })` |
| Untertitel toggle | `_KDB.api.header.dispatch({ type: "header/toggleSubtitle", payload: { source: "kdbControl" } })` |
| Title radio | `_KDB.api.header.dispatch({ type: "header/startTitleEdit", payload: { source: "kdbControl" } })` |
| Subtitle radio | `_KDB.api.header.dispatch({ type: "header/startSubtitleEdit", payload: { source: "kdbControl" } })` |

**Geen** `_KDB.events.emit("header:…Requested")` / `footer:…Requested` voor bovenstaande zolang owners **`header`** / **`footer`** bekend en geladen zijn.

---

## 5. Impact op bestaande catalog / `kdbControl.md` §6

- **`header:toggleRequested`**, **`header:editRequested`**, **`header:subtitleToggleRequested`**, **`header:subtitleEditRequested`**, **`footer:toggleRequested`**: voor **toolbox → bekende owner** flows **vervangen** door directe dispatch zodra `header`/`footer` modules landen.  
- **Follow-up bij implementatie:** pas `kdbControl.md` §6, `architecture/eventSubscribe.md` en code aan — **verwijder** of **archiveer** request-entries die geen geldige `events.mdc`-motivatie meer hebben.  
- **`tabs:toolRequested`:** **buiten scope** van deze delta (ongewijzigd tenzij aparte CP).

---

## 6. Teardown / runtime

- kdbControl **schrijft niet** in `_KDB.state.header` / `_KDB.state.footer`.  
- kdbControl mag **subscriptions** houden **alleen** om na **selector-reads** toolbox-DOM te syncen (of polling op mount — execution spec); unsubscribe in **`kdbControl.destroy()`** onder `_KDB.runtime.kdbControl.subscriptions` (keys in execution spec). **Geen** state-mirror in reducer.

---

## 7. Approval log

| Date | Actor | Note |
|------|-------|------|
| 2026-05-13 | user | CP-1 approved: §2 resolved decisions 1–6; contracts `header.md` / `footer.md` marked CP-1 approved. |
