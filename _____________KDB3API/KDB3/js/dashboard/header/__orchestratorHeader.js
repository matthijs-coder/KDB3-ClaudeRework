define(["./config/headerLabels", "./createHeaderController", "./state/initialState"], function (_headerLabels, _createHeaderController, _initialState) {
  "use strict";
  /**
   * Wires header module defaults. Field `status` (`idle`|`active`|`removed`) is domain chrome presence,
   * not the module's optional `lifecycle` field (see lifecycleVocabulary.md vs header.md).
   */
  function __orchestratorHeader(_KDB) {
    _KDB.state.header = _KDB.state.header || _initialState();
    _KDB.runtime.header = _KDB.runtime.header || {
      domRefs: { rootEl: null, titleEl: null, subtitleEl: null, draftTitleEl: null, draftSubtitleEl: null, iconEl: null, mountTargetEl: null },
      abortControllers: {},
      subscriptions: {},
      listeners: {},
    };
    try {
      _KDB.config = _KDB.config || {};
      _KDB.config.labels = _KDB.config.labels || {};
      _KDB.config.labels.de = _KDB.config.labels.de || {};
      _KDB.config.labels.de.header = Object.assign({}, _headerLabels, _KDB.config.labels.de.header || {});
    } catch (err) {
      console.error("[header.orchestrator] labels merge failed", err);
    }
    _KDB.api.header = _createHeaderController(_KDB);
  }
  return __orchestratorHeader;
});
