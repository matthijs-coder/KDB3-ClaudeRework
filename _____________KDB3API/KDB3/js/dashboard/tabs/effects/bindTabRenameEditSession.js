define(["./startTabRenameEditSession.js", "./commitTabRenameEditSession.js", "./cleanupTabRenameEditSession.js"], function (_startTabRenameEditSession, _commitTabRenameEditSession, _cleanupTabRenameEditSession) {
  "use strict";

  return {
    startTabRenameEditSession: _startTabRenameEditSession,
    cleanupTabRenameEditSession: _cleanupTabRenameEditSession,
    commitOutgoingEditSession: _commitTabRenameEditSession
  };
});
