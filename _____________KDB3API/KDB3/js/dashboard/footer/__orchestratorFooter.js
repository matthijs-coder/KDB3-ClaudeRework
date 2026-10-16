define(["./createFooterController", "./state/initialState"], function (_createFooterController, _initialState) {
  "use strict";
  /**
   * Wires footer module defaults. `status` tri-state is domain chrome presence, not module `lifecycle`.
   */
  function __orchestratorFooter(_KDB) {
    _KDB.state.footer = _KDB.state.footer || _initialState();
    _KDB.runtime.footer = _KDB.runtime.footer || {
      domRefs: {
        rootEl: null,
        barEl: null,
        dashboardTitleEl: null,
        dataAktEl: null,
        centerDateUserEl: null,
        pageIndicatorEl: null,
        mountTargetEl: null,
      },
      abortControllers: {},
      subscriptions: {},
      listeners: {},
    };
    var facet = _KDB.runtime.footer.dashboardFacet;
    var cognosHost = _KDB.services && _KDB.services.cognosHost;
    _KDB.runtime.footer.dashboardFacet = facet || (cognosHost && cognosHost.dashboard) || null;
    _KDB.api.footer = _createFooterController(_KDB);
  }
  return __orchestratorFooter;
});
