define([
  "./config.js",
  "./config/actionTypes.js",
  "./dispatchResult.js",
  "./fontSize.js",
  "./history.js",
  "./view.js",
  "./widgetRuntime.js",
  "../../../core/utils/kit/runtime.js"
], function (_config, _actionTypes, _dispatchResult, _fontSize, _history, _view, _widgetRuntime, _rt) {
  "use strict";

  var EDIT_ARM_TIMER = "editArm";

  function endEditDom(_KDB, _widgetId, _nodes, _restoreOriginal) {
    var runtime = _widgetRuntime.ensureWidgetRuntime(_KDB, _widgetId);
    if (_nodes && _nodes.editableEl) {
      _nodes.editableEl.contentEditable = "false";
      _nodes.editableEl.removeAttribute(_config.editActiveAttr);
    }
    if (_restoreOriginal && runtime.editSession.originalText != null) {
      _view.syncTextContentDom(_nodes, runtime.editSession.originalText);
    }
    runtime.editSession = _widgetRuntime.createIdleEditSession();
  }

  function abortEditController(_runtime) {
    _rt.clearTimer(_runtime.timers, EDIT_ARM_TIMER);
    var controller = _runtime.abortControllers.edit;
    if (controller) {
      controller.abort();
      delete _runtime.abortControllers.edit;
    }
  }

  // Used by widget cleanup and module destroy: leaves no contenteditable behind and restores the original text.
  function endOpenEdit(_KDB, _widgetId, _runtime) {
    if (!_runtime.editSession.isActive) {
      return;
    }
    abortEditController(_runtime);
    var resolved = _view.resolveEditableNodes(_widgetId, _runtime.domRefs.shellEl || null);
    endEditDom(_KDB, _widgetId, resolved && resolved.editableEl ? resolved : _runtime.domRefs, true);
  }

  function readTextForCommit(_context, _widgetId, _nodes) {
    var fromState = _context.selectors.readTextContent(_context._KDB, _widgetId);
    if (fromState != null) {
      return String(fromState);
    }
    var target = _nodes.paragraphEl || _nodes.editableEl;
    return target ? String(target.textContent || "") : "";
  }

  // Best effort: the text is already committed, so a failing refit must not fail the edit.
  async function refitAutomaticFont(_context, _widgetId, _nodes) {
    var runtime = _widgetRuntime.ensureWidgetRuntime(_context._KDB, _widgetId);
    if ((runtime.fontSize || _config.automaticFontSize) !== _config.automaticFontSize) {
      return { ok: true, skipped: true };
    }
    try {
      return await _fontSize.applyFontSize(_context._KDB, _widgetId, _nodes, _config.automaticFontSize);
    } catch (err) {
      console.error("[widgetText.refitAutomaticFont] failed", { widgetId: _widgetId }, err);
      return { ok: false };
    }
  }

  async function commitConfirmedText(_context, _widgetId, _inputNodes, _opSeq, _payload) {
    var KDB = _context._KDB;
    if (_widgetRuntime.isStaleOpSeq(KDB, _widgetId, _opSeq)) {
      return _dispatchResult.staleResult(_widgetId, _opSeq);
    }
    endEditDom(KDB, _widgetId, _inputNodes, false);
    var nodes = _view.resolveEditableNodes(_widgetId, _inputNodes.shellEl);
    _widgetRuntime.storeDomRefs(KDB, _widgetId, nodes);
    var isReplay = _payload.isHistoryReplay === true;
    var previousText = _payload.previousText != null
      ? String(_payload.previousText)
      : readTextForCommit(_context, _widgetId, nodes);
    var nextText = _payload.nextText != null ? String(_payload.nextText) : previousText;
    if (!isReplay && previousText === nextText) {
      return { ok: true, widgetId: _widgetId, opSeq: _opSeq, skipped: true, reasonCode: "WIDGET_TEXT_UNCHANGED" };
    }
    _view.syncTextContentDom(nodes, nextText);
    _context.dispatchInternal({
      type: _actionTypes.COMMIT_TEXT_CONTENT,
      widgetId: _widgetId,
      payload: { text: nextText }
    });
    if (!isReplay) {
      var historyResult = _history.pushTextEditHistory(KDB, _widgetId, previousText, nextText);
      if (!historyResult.ok) {
        return _dispatchResult.failureResult(_widgetId, _opSeq, "WIDGET_TEXT_HISTORY_COMMIT_FAILED", historyResult.errorMessage);
      }
    }
    await refitAutomaticFont(_context, _widgetId, nodes);
    return { ok: true, widgetId: _widgetId, opSeq: _opSeq, status: "success" };
  }

  function cancelInlineTextEdit(_context, _widgetId, _nodes, _opSeq) {
    if (!_widgetRuntime.isStaleOpSeq(_context._KDB, _widgetId, _opSeq)) {
      endEditDom(_context._KDB, _widgetId, _nodes, true);
    }
  }

  function bindInlineTextEdit(_KDB, _widgetId, _nodes, _callbacks, _commitOnBlur) {
    var runtime = _widgetRuntime.ensureWidgetRuntime(_KDB, _widgetId);
    abortEditController(runtime);
    var controller = new AbortController();
    runtime.abortControllers.edit = controller;
    var editableEl = _nodes.editableEl;

    function onKeyDown(_event) {
      if (controller.signal.aborted || _event.key !== "Escape") {
        return;
      }
      try {
        _event.preventDefault();
        abortEditController(runtime);
        _callbacks.onCancel();
      } catch (err) {
        console.error("[widgetText.editKeyDown] failed", { widgetId: _widgetId }, err);
      }
    }

    function onFocusOut(_event) {
      if (controller.signal.aborted || !_commitOnBlur) {
        return;
      }
      var relatedTarget = _event.relatedTarget;
      if (relatedTarget && editableEl.contains(relatedTarget)) {
        return;
      }
      try {
        controller.abort();
        var paragraph = editableEl.querySelector("p");
        var nextText = paragraph ? paragraph.textContent : editableEl.textContent;
        _callbacks.onConfirm(nextText != null ? String(nextText) : "");
      } catch (err) {
        console.error("[widgetText.editFocusOut] failed", { widgetId: _widgetId }, err);
      }
    }

    // Armed on the next tick so the click that opened the editor cannot blur it immediately.
    _rt.scheduleTimeout(runtime.timers, EDIT_ARM_TIMER, function () {
      if (controller.signal.aborted) {
        return;
      }
      editableEl.addEventListener("keydown", onKeyDown, { signal: controller.signal });
      editableEl.addEventListener("focusout", onFocusOut, { signal: controller.signal });
    }, 0);
  }

  function selectEditableText(_nodes) {
    var range = document.createRange();
    range.selectNodeContents(_nodes.paragraphEl || _nodes.editableEl);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function startInlineTextEdit(_context, _widgetId, _inputNodes, _opSeq, _payload) {
    var KDB = _context._KDB;
    var runtime = _widgetRuntime.ensureWidgetRuntime(KDB, _widgetId);
    var nodes = _inputNodes;
    try {
      if (runtime.editSession.isActive) {
        abortEditController(runtime);
        endEditDom(KDB, _widgetId, nodes, true);
        nodes = _view.resolveEditableNodes(_widgetId, nodes.shellEl);
        _widgetRuntime.storeDomRefs(KDB, _widgetId, nodes);
      }
      var previousText = String((nodes.paragraphEl || nodes.editableEl).textContent || "");
      runtime.editSession = { isActive: true, originalText: previousText, startedAt: Date.now() };
      nodes.editableEl.contentEditable = "true";
      nodes.editableEl.setAttribute(_config.editActiveAttr, "1");
      nodes.editableEl.focus();
      if (_payload.selectText !== false) {
        selectEditableText(nodes);
      }
      bindInlineTextEdit(KDB, _widgetId, nodes, {
        onConfirm: function (nextText) {
          commitConfirmedText(_context, _widgetId, nodes, _opSeq, {
            nextText: nextText,
            previousText: previousText,
            isHistoryReplay: _payload.isHistoryReplay,
            source: _payload.source
          }).catch(function (err) {
            console.error("[widgetText.confirmEdit] failed", { widgetId: _widgetId }, err);
          });
        },
        onCancel: function () {
          cancelInlineTextEdit(_context, _widgetId, nodes, _opSeq);
        }
      }, _payload.commitOnBlur !== false);
      return { ok: true, widgetId: _widgetId, opSeq: _opSeq, status: "success" };
    } catch (err) {
      console.error("[widgetText.startInlineTextEdit] failed", { widgetId: _widgetId }, err);
      endEditDom(KDB, _widgetId, nodes, true);
      return _dispatchResult.failureResult(_widgetId, _opSeq, "WIDGET_TEXT_EDIT_START_FAILED", err);
    }
  }

  async function handleCommitTextEdit(_context, _action) {
    var widgetId = _action.widgetId;
    var payload = _action.payload || {};
    var opSeq = _widgetRuntime.ensureOpSeq(_context._KDB, widgetId, _action.opSeq);
    var shellEl = _view.resolveWidgetShell(widgetId);
    if (!shellEl) {
      return _dispatchResult.failureResult(widgetId, opSeq, "WIDGET_TEXT_SHELL_MISSING");
    }
    var nodes = _view.resolveEditableNodes(widgetId, shellEl);
    if (!nodes || !nodes.editableEl) {
      return _dispatchResult.failureResult(widgetId, opSeq, "WIDGET_TEXT_EDITABLE_MISSING");
    }
    _widgetRuntime.storeDomRefs(_context._KDB, widgetId, nodes);
    if (payload.nextText != null) {
      return commitConfirmedText(_context, widgetId, nodes, opSeq, payload);
    }
    return startInlineTextEdit(_context, widgetId, nodes, opSeq, payload);
  }

  return {
    handleCommitTextEdit: handleCommitTextEdit,
    endOpenEdit: endOpenEdit
  };
});
