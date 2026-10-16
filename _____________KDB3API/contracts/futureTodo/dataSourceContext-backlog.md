# Future Todo: `dataSourceContext`

Add a dedicated `dataSourceContext` module when datasource switching becomes user-facing.

The module should own the active metrics/Kennzahlen datasource, expose `getCurrentMetricsDataSource()` or an equivalent selector, and orchestrate downstream rebuilds for metrics tree, filters and widget rebinding. Until then, `Personal_KDB` remains the temporary default through global config and local module resolvers.
