/*
 * services.widgetBinding: one entry for "build the plan, then apply it" over services.widgetBindingPlan and
 * services.widgetBindingApply. Both services keep working on their own; their envelopes are returned unchanged
 * (the very same objects), so callers read plan and apply results exactly as they do today.
 *
 *   run(spec, opts) -> Promise<{ stage, plan, applyResult, missing? }>
 *     opts.applyOptions  object | function(plan) -> object, handed as-is to widgetBindingApply.applyBinding(plan, options)
 *     opts.beforeApply   function(plan), called synchronously after a successful plan; returning false cancels the apply
 *                        (stale op, abort, observer install and similar caller checks live here)
 *     stage "unavailable"  a service is missing: missing = "widgetBindingPlan" | "widgetBindingApply", nothing was called
 *     stage "plan"         buildPlan did not succeed (plan.ok !== true or plan.status !== "success"): plan is the raw
 *                          return value (possibly undefined), applyResult is null, apply was not called
 *     stage "cancelled"    beforeApply returned false: plan is set, applyResult is null
 *     stage "applied"      applyResult is the raw applyBinding return; its own status (success, error, timeout,
 *                          aborted) is NOT interpreted here
 *   checkAvailable() -> { ok, missing }   same availability test as run, for callers that must check before
 *                                         doing other work
 *
 * A throwing buildPlan, a throwing hook or a rejected applyBinding rejects run, as the unwrapped call would reject
 * inside the caller's async function. The plan and the hook run before the first await. spec is passed by
 * reference (no clone). The two services are looked up on every call. Stateless: nothing to tear down.
 */
define([], function () {
  "use strict";

  function readServices(_KDB) {
    var services = _KDB && _KDB.services ? _KDB.services : {};
    return { plan: services.widgetBindingPlan, apply: services.widgetBindingApply };
  }

  function readMissing(_services) {
    if (!_services.plan || typeof _services.plan.buildPlan !== "function") return "widgetBindingPlan";
    if (!_services.apply || typeof _services.apply.applyBinding !== "function") return "widgetBindingApply";
    return null;
  }

  function isPlanSuccess(_plan) {
    return !!_plan && _plan.ok === true && _plan.status === "success";
  }

  function createWidgetBindingService(_KDB) {
    function checkAvailable() {
      var missing = readMissing(readServices(_KDB));
      return { ok: missing === null, missing: missing };
    }

    async function run(_spec, _opts) {
      var opts = _opts || {};
      var services = readServices(_KDB);
      var missing = readMissing(services);
      var plan;
      var options;
      if (missing) {
        return { stage: "unavailable", plan: null, applyResult: null, missing: missing };
      }
      plan = services.plan.buildPlan(_spec);
      if (!isPlanSuccess(plan)) {
        return { stage: "plan", plan: plan, applyResult: null };
      }
      if (typeof opts.beforeApply === "function" && opts.beforeApply(plan) === false) {
        return { stage: "cancelled", plan: plan, applyResult: null };
      }
      options = typeof opts.applyOptions === "function" ? opts.applyOptions(plan) : opts.applyOptions;
      return { stage: "applied", plan: plan, applyResult: await services.apply.applyBinding(plan, options) };
    }

    return { run: run, checkAvailable: checkAvailable };
  }

  function registerWidgetBinding(_KDB) {
    _KDB.services = _KDB.services || {};
    if (!_KDB.services.widgetBinding) {
      _KDB.services.widgetBinding = createWidgetBindingService(_KDB);
    }
    return _KDB.services.widgetBinding;
  }

  return registerWidgetBinding;
});
