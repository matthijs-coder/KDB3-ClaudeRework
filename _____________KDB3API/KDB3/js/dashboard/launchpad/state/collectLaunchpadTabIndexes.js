define([], function () {
  function __controller(_tabsConfig) {
    const dashboardTabIndexes = [];
    const helperTabIndexes = [];

    collectTabIndexes(_tabsConfig, dashboardTabIndexes, helperTabIndexes);

    return {
      dashboardTabIndexes: dashboardTabIndexes.sort(sortNumbers),
      helperTabIndexes: helperTabIndexes.sort(sortNumbers)
    };
  }

  function collectTabIndexes(_tabsConfig, dashboardTabIndexes, helperTabIndexes) {
    if (Array.isArray(_tabsConfig)) {
      collectArrayTabIndexes(_tabsConfig, dashboardTabIndexes, helperTabIndexes);
      return;
    }

    if (_tabsConfig && Array.isArray(_tabsConfig.tabs)) {
      collectArrayTabIndexes(_tabsConfig.tabs, dashboardTabIndexes, helperTabIndexes);
      return;
    }

    if (_tabsConfig && typeof _tabsConfig === "object") {
      collectObjectTabIndexes(_tabsConfig, dashboardTabIndexes, helperTabIndexes);
    }
  }

  function collectArrayTabIndexes(tabsConfig, dashboardTabIndexes, helperTabIndexes) {
    let index = 0;

    while (index < tabsConfig.length) {
      collectTabIndex(tabsConfig[index], index, true, dashboardTabIndexes, helperTabIndexes);
      index += 1;
    }
  }

  function collectObjectTabIndexes(_tabsConfig, dashboardTabIndexes, helperTabIndexes) {
    const keys = Object.keys(_tabsConfig);
    let index = 0;

    while (index < keys.length) {
      collectTabIndex(_tabsConfig[keys[index]], Number(keys[index]), false, dashboardTabIndexes, helperTabIndexes);
      index += 1;
    }
  }

  function collectTabIndex(tabConfig, fallbackIndex, shouldIncludeDefault, dashboardTabIndexes, helperTabIndexes) {
    const role = tabConfig && tabConfig.role;
    const tabIndex = readTabIndex(tabConfig, fallbackIndex);

    if (role === "helper") {
      helperTabIndexes.push(tabIndex);
      return;
    }

    if (role === "dashboard" || (shouldIncludeDefault && (role === "main" || role === undefined))) {
      dashboardTabIndexes.push(tabIndex);
    }
  }

  function readTabIndex(tabConfig, fallbackIndex) {
    const index = tabConfig && (tabConfig.corTabIndex || tabConfig.index || tabConfig.order);
    const parsed = Number(index);

    if (Number.isFinite(parsed)) {
      return parsed;
    }

    return fallbackIndex;
  }

  function sortNumbers(left, right) {
    return left - right;
  }

  return __controller;
});
