# Future todo — Jahr-filter: huidig jaar / geen selectie

**SUPERSEDED 2026-09-01.** Product lock is last-month pin via leftover `NewestStichtag`, not calendar year. Authority: `contracts/widgetTopN-newestStichtag-contractdelta.md`. Captain: `contracts/futureTodo/topn-newestStichtag-captain-handoff-2026-09-01.md`. Do not implement this ticket’s calendar-year default.

**Aangemaakt:** 2026-08-23 (±16:54)  
**Map:** `futureTodoNew(23.08.2026)`  
**Status:** superseded  
**Eigenaar:** TopN NewestStichtag captain (see handoff)  
**Niet:** captain E, captain F, slice 3, slice 4+

## Wat dit níet is

Dit is **geen** restpunt van cluster E slice 3 (visualization-facet + Top-N).  
Dit is **geen** triage-kandidaat voor captain F.  
Top-N zelf is live **groen** wanneer de gebruiker een Jahr **kiest** (bewezen: Jahr **2025** → Top-N werkt, user 2026-08-23 ±16:54). Slice 3 is daarmee **GEACCEPTEERD**.

Niet verwarren met `widgetTopN-cleanup-followup-backlog.md` F5 (`jahrFilterValue`-fallbackketen als cleanup). Dat is module-hygiëne. Dit ticket is **ontbrekende productfunctionaliteit**.

## Symptoom

Als het **globale** Jahr-filter **geen selectie** heeft (`readFilterValues` → `{ok:true, data:[]}`):

1. `resolveTopNJahrFilterValue` valt terug op de year-tabel (`tableData.waitForRows("year")`).
2. Die fallback kiest de lexicografisch grootste `d` (live: **2026**).
3. De Top-N-helper-query (o.a. Berufsfamilie + Monatsdurchschnitt + `P_PS_K_01`) kan dan **0 rijen** teruggeven terwijl Cognos wél kolommen levert → `WIDGET_TOPN_RESULT_EMPTY`, dropdown klapt terug (by design tot apply bevestigd).

Met een **expliciete** Jahr-selectie (live: **2025**) levert dezelfde Top-N-keten rijen. Functionaliteit van slice 3 is groen.

## Wat al bewezen is (niet opnieuw onderzoeken als lookup-bug)

Live H1, console-context `top`, 2026-08-23 ±16:45:

- `getPageContext().getPageContextItem({scope:"global", itemId})` en de filters-facet-index (`getAllGlobalFilterItems`) raken **hetzelfde** Cognos-object.
- Beide `values: []`. Facet: `{ok:true, outcome:"ok", data:[]}`.
- Backup (pre-slice-3) zou hier óók `null` hebben en dezelfde year-tabel-fallback hebben genomen. **Geen slice-3-regressie in de Jahr-read.**

`itemId` (config, geen dump-constante):  
`[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]`  
(`core/config/visualizations/topNHelper.js` → `jahrColumnId`).

## Gevraagde oplossing (later, eigen kickoff)

Productbesluit + implementatie voor minstens:

- **Geen Jahr-selectie** op het globale filter (lege `data:[]` is een gevonden item, geen misser).
- **Huidig kalenderjaar** (of rapport-jaar) als bedoelde default, i.p.v. “laatste rij in de year-tabel” (die 2026 kan zijn zonder kubusdata).

Mogelijke richtingen (niet voorschrijven): default-selectie op het host-filter; Top-N zonder jaar-include bij lege global; “huidig jaar” uit een andere bron dan max-`d`; fail-visible i.p.v. stille 0-rijen. Eerst product, dan code.

## Buiten scope

- Cluster E slices 4–6 (`dataQuery`, tabs-lek, sluiten).
- Captain F fase 1/2.
- Visualization-facet, helper-claim/apply, `waitForTableQueryResult` globaal ombouwen.
- DEZPV-hiërarchie / Sicht-toast (cluster D, data-/Cognos).

## Bronnen

- `CLUSTER_E_RAPPORT_2026-08-20.md` §S3.5b, §S3.7 (H1 live + Jahr-2025-acceptatie).
- `REMEDIATION_KICKOFF_PROMPTS.md` status-update 2026-08-23 ±16:54 + negende addendum bij Prompt E.
- Live: `dashboard/widgets/widgetVis/effects/resolveTopNJahrFilterValue.js`.
