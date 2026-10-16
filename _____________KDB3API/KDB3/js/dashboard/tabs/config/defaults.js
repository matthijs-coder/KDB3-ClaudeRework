define([], function () {
  "use strict";

  return {
    MAX_USER_TABS: 5,
    HELPER_TAB_INDEX: 5,
    MIN_VISIBLE_USER_TABS: 1,
    VISIBLE_CLASS: "KDB_visible",
    USER_TAB_BUTTON_CLASS: "kdb-user-tab-btn",
    HELPER_TAB_BUTTON_CLASS: "kdb-helper-tab-btn",
    HELPER_TAB_CONTENT_CLASS: "kdb-helper-tab",
    POLL_INTERVAL_MS: 300,
    HYDRATE_TIMEOUT_MS: 30000,
    TRAVERSE_CLICK_DELAY_MS: 150,
    EDIT_ICON_IMAGES_BASE: "./v1/ext/KDB3/images/",
    EDIT_ICON_CLASS: "kdb-tab-edit-icon",
    EDIT_ICON_WRAPPER_CLOSE_CLASS: "KDB_tabClose",
    EDIT_ICON_WRAPPER_DUPLICATE_CLASS: "KDB_tabCopy",
    EDIT_ICON_WRAPPER_MOVE_CLASS: "KDB_tabMove",
    EDIT_ICON_SPAN_CLOSE_CLASS: "close",
    EDIT_ICON_SPAN_DUPLICATE_CLASS: "copy",
    EDIT_ICON_SPAN_MOVE_CLASS: "move",
    EDIT_ICON_DELETE_CLASS: "kdb-tab-edit-icon--delete",
    EDIT_ICON_DUPLICATE_CLASS: "kdb-tab-edit-icon--duplicate",
    EDIT_ICON_MOVE_CLASS: "kdb-tab-edit-icon--move",
    EDIT_ICON_DELETE_FILE: "close_32.svg",
    EDIT_ICON_DUPLICATE_FILE: "copy.svg",
    EDIT_ICON_MOVE_FILE: "move.svg",
    EDIT_ICON_DELETE_TITLE: "Tab entfernen",
    EDIT_ICON_DUPLICATE_TITLE: "Tab kopieren",
    EDIT_ICON_MOVE_TITLE: "Tab verschieben",
    EDITING_LABEL_CLASS: "kdb-tab-label-editing",
    // Legacy parity (KDB2 configurationToolboxHelpers): icons/commit follow
    // focus loss after a short delay so an in-flight icon click still lands.
    EDIT_SESSION_FOCUSOUT_DELAY_MS: 100,
    // Wave-1 gate per kdbControl-tabsCrud-contractdelta §2: enabled 2026-08-12
    // after the tranche-1 end-to-end smoketests (delete, GET consistency,
    // min-visible, rollback) passed in Cognos.
    TAB_DELETE_UI_ENABLED: true,
    TAB_DELETE_CONFIRM_TITLE: "Diese Registerkarte löschen?",
    TAB_DELETE_CONFIRM_TEXT: "Der gesamte Inhalt dieser Registerkarte wird ebenfalls gelöscht.",
    TAB_DELETE_MIN_VISIBLE_TEXT: "Die letzte sichtbare Registerkarte kann nicht gelöscht werden.",
    TAB_DELETE_CONFLICT_TEXT: "Es läuft bereits eine Registerkarten-Aktion. Bitte warten Sie einen Moment.",
    TAB_DELETE_FAILED_TITLE: "Registerkarte löschen fehlgeschlagen",
    TAB_MUTATION_DEGRADED_TEXT: "Die Aktion wurde ausgeführt, aber die Ansicht konnte nicht vollständig aktualisiert werden. Bitte prüfen Sie die Filterauswahl.",
    // Tranche-2 gate: enabled 2026-08-12 after the move smoketests (rotation,
    // GET consistency, guards, rollback, filter hostResync + popup re-arm)
    // passed in Cognos.
    TAB_MOVE_UI_ENABLED: true,
    TAB_MOVE_CHOOSE_TITLE: "Registerkarte verschieben",
    TAB_MOVE_CHOOSE_TEXT: "Wählen Sie die neue Position für diese Registerkarte.",
    TAB_MOVE_FAILED_TITLE: "Registerkarte verschieben fehlgeschlagen",
    // Tranche-3 gate: enabled 2026-08-12 for the PO smoketest round
    // (duplicate, GET consistency, max-visible guard, rollback). Revert to
    // false if a smoketest fails.
    TAB_DUPLICATE_UI_ENABLED: true,
    TAB_DUPLICATE_CONFIRM_TITLE: "Diese Registerkarte duplizieren?",
    TAB_DUPLICATE_CONFIRM_TEXT: "Eine Kopie dieser Registerkarte wird rechts neben der Quelle eingefügt.",
    TAB_DUPLICATE_MAX_VISIBLE_TEXT: "Maximale Anzahl an Registerkarten erreicht.",
    TAB_DUPLICATE_FAILED_TITLE: "Registerkarte duplizieren fehlgeschlagen"
  };
});
