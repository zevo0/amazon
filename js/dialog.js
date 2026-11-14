/* =========================================================
   Dialogs & toasts (replaces alert / confirm / prompt)
   uiAlert(message, { title, type })            -> Promise<void>
   uiConfirm(message, { title, confirmText, cancelText, danger }) -> Promise<boolean>
   uiPrompt(message, { defaultValue, placeholder })  -> Promise<string|null>
   uiToast(message, { type })
   type: 'info' | 'success' | 'error'
   ========================================================= */

const UI_ICONS = {
  info: '<path d="M12 8v5M12 16.5v.01"/><circle cx="12" cy="12" r="9"/>',
  success: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  error: '<path d="M12 7.5v5.5M12 16.5v.01"/><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  danger: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  question: '<path d="M9.5 9.2a2.6 2.6 0 1 1 3.6 2.4c-.7.4-1.1 1-1.1 1.8M12 17v.01"/><circle cx="12" cy="12" r="9"/>',
};

function uiEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function uiOpenDialog({ title, message, iconType, buttons, input }) {
  return new Promise(resolve => {
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'ui-dialog-overlay';
    overlay.innerHTML = `
      <div class="ui-dialog" role="dialog" aria-modal="true" aria-labelledby="uiDialogTitle">
        <div class="ui-dialog-icon ${iconType}">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI_ICONS[iconType] || UI_ICONS.info}</svg>
        </div>
        <div class="ui-dialog-title" id="uiDialogTitle">${uiEscape(title)}</div>
        <div class="ui-dialog-message">${uiEscape(message)}</div>
        ${input ? `<input class="ui-dialog-input" type="text" value="${uiEscape(input.defaultValue)}" placeholder="${uiEscape(input.placeholder)}">` : ''}
        <div class="ui-dialog-actions">
          ${buttons.map((b, i) => `<button type="button" class="ui-dialog-btn ${b.kind}" data-i="${i}">${uiEscape(b.label)}</button>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const inputEl = overlay.querySelector('.ui-dialog-input');
    const btnEls = [...overlay.querySelectorAll('.ui-dialog-btn')];
    const primaryEl = btnEls.find(b => !b.classList.contains('ghost')) || btnEls[0];

    function close(result) {
      document.removeEventListener('keydown', onKey, true);
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 250);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      resolve(result);
    }
    function pick(i) { close(buttons[i].result(inputEl ? inputEl.value : undefined)); }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(buttons.find(b => b.kind === 'ghost') ? buttons.find(b => b.kind === 'ghost').result() : buttons[0].result(inputEl && inputEl.value)); }
      else if (e.key === 'Enter' && (inputEl || document.activeElement === document.body)) { e.preventDefault(); primaryEl.click(); }
      else if (e.key === 'Tab') {
        const focusables = inputEl ? [inputEl, ...btnEls] : btnEls;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey, true);

    btnEls.forEach(b => b.addEventListener('click', () => pick(Number(b.dataset.i))));
    // click on the backdrop = dismiss (same as Esc), except for prompts so typed text isn't lost
    if (!input) overlay.addEventListener('click', e => { if (e.target === overlay) onKey({ key: 'Escape', preventDefault() {}, stopPropagation() {} }); });

    (inputEl || primaryEl).focus();
    if (inputEl) inputEl.select();
  });
}

function uiAlert(message, { title, type = 'info' } = {}) {
  const defaults = { info: 'تنبيه', success: 'تم بنجاح', error: 'حدث خطأ' };
  return uiOpenDialog({
    title: title || defaults[type] || defaults.info,
    message,
    iconType: type,
    buttons: [{ label: 'حسنًا', kind: 'primary', result: () => undefined }],
  });
}

function uiConfirm(message, { title = 'تأكيد', confirmText = 'تأكيد', cancelText = 'رجوع', danger = false } = {}) {
  return uiOpenDialog({
    title,
    message,
    iconType: danger ? 'danger' : 'question',
    buttons: [
      { label: cancelText, kind: 'ghost', result: () => false },
      { label: confirmText, kind: danger ? 'danger' : 'primary', result: () => true },
    ],
  });
}

function uiPrompt(message, { title = 'إدخال', defaultValue = '', placeholder = '', confirmText = 'حفظ', cancelText = 'إلغاء' } = {}) {
  return uiOpenDialog({
    title,
    message,
    iconType: 'info',
    input: { defaultValue, placeholder },
    buttons: [
      { label: cancelText, kind: 'ghost', result: () => null },
      { label: confirmText, kind: 'primary', result: value => value },
    ],
  });
}

function uiToast(message, { type = 'info', duration = 3200 } = {}) {
  let wrap = document.querySelector('.ui-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'ui-toast-wrap';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `ui-toast ${type}`;
  el.innerHTML = `<i></i><span>${uiEscape(message)}</span>`;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 350);
  }, duration);
}
