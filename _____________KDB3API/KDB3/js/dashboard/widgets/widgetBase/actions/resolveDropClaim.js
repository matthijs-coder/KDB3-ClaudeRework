// shim (WS-L phase A): remove in Phase B; re-exports the merged implementation
define(["../launchpadRoute.js"], function (_m) {
  return Object.assign(_m.resolveClaimedWidget, { readPadShellEligibility: _m.readPadShellEligibility });
});
