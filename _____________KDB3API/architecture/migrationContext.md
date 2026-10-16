## Migration Context

This file captures why the current architecture exists. It is historical context, not a normative rule. Normative rules live in `projectStructureRules.md`, `stateOwnership.md` and the rule files under `.cursor/rules/`.

### Background

We come from a KDB3/Cognos dashboard project where much functionality grew historically through `_KDB`. `_KDB.state` was used as a central place for both real dashboard state and technical runtime objects such as DOM references, listeners, subscriptions and temporary coordination handles. This worked pragmatically but made ownership, cleanup, testing and code search difficult. The kdbControl region was the clearest symptom: simple UI logic such as checked/unchecked toggles ended up spread across DOM builders, state mutations, effects, CSS and Cognos dependencies.

### Direction

The direction we want is: autarkic modules with central state, but without public write access. `_KDB.state` remains the central, inspectable, JSON-serializable dashboard/session state. Technical runtime objects move to `_KDB.runtime`. Every state subtree has one owner / canonical writer. Other modules read through readers/selectors or public APIs, and request changes through module APIs, dispatch/actions or events.

### Services vs Module APIs

We also separate `_KDB.services` and `_KDB.api` clearly: services are shared infrastructure such as table data, history and Cognos adapters; the event bus lives at the top-level `_KDB.events` and is not a service per `_____________KDB3API/.cursor/rules/kdb-object.mdc` and `events.mdc`. `_KDB.api.<module>` is the public entry point to feature modules such as kdbControl, widgets, launchpad, filters, tabs, header and footer. This separation prevents god objects and direct deep state mutations.

### Project Hygiene Goals

We want rules that keep the project scannable and AI-friendly: small files, predictable folders (`config/`, `state/`, `view/`, `effects/`, `adapters/`), thin orchestrators, controllers as public API factories, pure reducers and separated effects. The goal is less hidden coupling, better local testing via harnesses outside Cognos, easier reading and searching, and lower token cost for AI agents.
