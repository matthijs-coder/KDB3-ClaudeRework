define(["./showToast.js"], function (_showToast) {
  "use strict";

  // The messages facet of the cognosHost service. Named with the Adapter
  // suffix that naming.mdc prescribes for host adapters; "facet" is the
  // architectural term for a domain-scoped part of the ring-1 adapter.
  // Transport for messageService only: showToast(text, type). Layer-1 host
  // is glassMessages; the ring-1 local is messagesApi. There is no
  // _KDB.cognosAPI.messages.
  function createMessagesAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return {
      showToast: _showToast.bind(null, ctx)
    };
  }

  return createMessagesAdapter;
});
