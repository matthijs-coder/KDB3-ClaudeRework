define([], function () {
  function terminalResetResult(_result) {
    return Object.assign({}, _result || {}, { __terminalResetResult: true });
  }

  function isTerminalResetResult(_result) {
    return !!(_result && _result.__terminalResetResult === true);
  }

  function stripTerminalResetResult(_result) {
    const clean = Object.assign({}, _result || {});
    delete clean.__terminalResetResult;
    return clean;
  }

  return {
    terminalResetResult: terminalResetResult,
    isTerminalResetResult: isTerminalResetResult,
    stripTerminalResetResult: stripTerminalResetResult
  };
});
