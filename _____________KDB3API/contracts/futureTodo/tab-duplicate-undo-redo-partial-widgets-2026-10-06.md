# futureTodo: undo/redo of a duplicate can omit widgets without a toast

**Date:** 2026-10-06 — PO vastenburg, live after the duplicate tranche
**Status:** classified, not approved for a fix

## Live

Copy works. Undo and redo usually place every widget. Rarely some widgets are missing. The PO saw no toast and nothing notable in the console.

## Classification

**(c) for the silent miss the PO saw.** Place and vis bind return `ok`. `deferRenderWait` skips the paint wait (`continueBindingPlanAndApply.js` sets `waitForStart` and `waitForComplete` to false). The next destination traverse, then the landing traverse, leaves the page before Cognos finishes painting. A later undo/redo of a redo (fresh duplicate) paints because the page is already mounted. No toast, no console error. The info-toast change does not catch this path.

**(b) remains for a real claim or fill miss.** Undo is a `widgetRebuild` delete. `runTabMutationSaga.js` now marks that `degraded` when `degradedEntries` is non-empty. History replay of duplicate undo/redo notifies `TAB_MUTATION_DEGRADED_TEXT`. Those widgets are still not rebuilt. A second Undo click does not retry the same step.

## Not scheduled

No paint-wait change until the PO asks. Do not turn `deferRenderWait` off for every bind. A fix would keep each rebuilt tab visible until `renderWidget` finishes, or run one paint pass after the landing traverse. That is a new spec.

## Not a fix yet

Do not change code until a spec says whether undo must treat `degradedEntries` like duplicate, and whether history replay shows `TAB_MUTATION_DEGRADED_TEXT`. That toast explains a partial update. It does not put the missing widgets back.
