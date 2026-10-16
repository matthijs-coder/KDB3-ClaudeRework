define([], function () {
  "use strict";

  function noopUnsubscribe() {}

  // dispose() drops every handler and abort-signal listener; afterwards emit does nothing and subscribe
  // hands back a no-op unsubscribe, so a late owner cannot revive the bus.
  function createEventBus() {
    const handlersByEventName = {};
    const activeUnsubscribes = new Set();
    const lifecycle = { isDisposed: false };

    function dispose() {
      lifecycle.isDisposed = true;
      Array.from(activeUnsubscribes).forEach(function (unsubscribe) { unsubscribe(); });
      activeUnsubscribes.clear();
    }

    return {
      emit: emitEvent.bind(null, handlersByEventName, lifecycle),
      subscribe: subscribeToEvent.bind(null, handlersByEventName, lifecycle, activeUnsubscribes),
      dispose: dispose
    };
  }

  function subscribeToEvent(_handlersByEventName, _lifecycle, _activeUnsubscribes, _eventName, _handler, _options) {
    if (!_eventName || typeof _eventName !== "string") {
      throw new Error("Event name must be a non-empty string.");
    }

    if (typeof _handler !== "function") {
      throw new Error("Event handler must be a function.");
    }

    if (_lifecycle.isDisposed) {
      return noopUnsubscribe;
    }

    if (!_handlersByEventName[_eventName]) {
      _handlersByEventName[_eventName] = [];
    }

    _handlersByEventName[_eventName].push(_handler);

    function unsubscribe() {
      _activeUnsubscribes.delete(unsubscribe);
      removeHandler(_handlersByEventName, _eventName, _handler);

      if (_options && _options.signal) {
        _options.signal.removeEventListener("abort", unsubscribe);
      }
    }

    _activeUnsubscribes.add(unsubscribe);

    if (_options && _options.signal) {
      if (_options.signal.aborted) {
        unsubscribe();
      } else {
        _options.signal.addEventListener("abort", unsubscribe, { once: true });
      }
    }

    return unsubscribe;
  }

  function emitEvent(_handlersByEventName, _lifecycle, _eventName, _payload) {
    if (_lifecycle.isDisposed) {
      return;
    }
    const handlers = (_handlersByEventName[_eventName] || []).slice();
    let index;

    for (index = 0; index < handlers.length; index += 1) {
      try {
        handlers[index](_payload);
      } catch (error) {
        console.error("[core.events.emit]", { eventName: _eventName }, error);
      }
    }
  }

  function removeHandler(_handlersByEventName, _eventName, _handler) {
    const handlers = _handlersByEventName[_eventName];

    if (!handlers) {
      return;
    }

    const index = handlers.indexOf(_handler);

    if (index !== -1) {
      handlers.splice(index, 1);
    }

    if (handlers.length === 0) {
      delete _handlersByEventName[_eventName];
    }
  }

  return createEventBus;
});
