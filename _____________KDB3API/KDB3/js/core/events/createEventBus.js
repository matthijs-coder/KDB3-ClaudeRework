define([], function () {
  "use strict";

  function createEventBus() {
    const handlersByEventName = {};

    return {
      emit: emitEvent.bind(null, handlersByEventName),
      subscribe: subscribeToEvent.bind(null, handlersByEventName)
    };
  }

  function subscribeToEvent(_handlersByEventName, _eventName, _handler, _options) {
    if (!_eventName || typeof _eventName !== "string") {
      throw new Error("Event name must be a non-empty string.");
    }

    if (typeof _handler !== "function") {
      throw new Error("Event handler must be a function.");
    }

    if (!_handlersByEventName[_eventName]) {
      _handlersByEventName[_eventName] = [];
    }

    _handlersByEventName[_eventName].push(_handler);

    function unsubscribe() {
      removeHandler(_handlersByEventName, _eventName, _handler);

      if (_options && _options.signal) {
        _options.signal.removeEventListener("abort", unsubscribe);
      }
    }

    if (_options && _options.signal) {
      if (_options.signal.aborted) {
        unsubscribe();
      } else {
        _options.signal.addEventListener("abort", unsubscribe, { once: true });
      }
    }

    return unsubscribe;
  }

  function emitEvent(_handlersByEventName, _eventName, _payload) {
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
