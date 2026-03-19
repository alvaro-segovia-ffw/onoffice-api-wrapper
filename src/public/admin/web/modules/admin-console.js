import { els } from './admin-elements.js';
import {
  bindCreateFormBehavior,
  createApiKey,
  fetchCurrentSession,
  handleAuditSubmit,
  handleAuditSelection,
  handleKeyDetailAccessClear,
  handleKeyDetailAccessInput,
  handleKeyDetailAccessPreset,
  handleKeyDetailAccessSuggestion,
  handleKeyDetailReset,
  handleKeyFiltersChange,
  handleKeyDetailSubmit,
  handleKeyAction,
  handleKeySelection,
  loadApiKeys,
  loadDashboard,
} from './admin-actions.js';
import { setStatus } from './dom-utils.js';
import { bindViewNavigation, setActiveView } from './admin-view.js';
import { redirectToLogin } from './admin-api.js';

function bindEvents() {
  els.btnLoad.addEventListener('click', loadDashboard);
  els.createForm.addEventListener('submit', createApiKey);
  bindCreateFormBehavior();
  els.keysTable.addEventListener('click', handleKeySelection);
  els.keySearchInput.addEventListener('input', handleKeyFiltersChange);
  els.keyStatusFilter.addEventListener('change', handleKeyFiltersChange);
  els.keyDetailForm.addEventListener('submit', handleKeyDetailSubmit);
  els.btnKeyDetailReset.addEventListener('click', handleKeyDetailReset);
  els.keyDetailAccessPresets.addEventListener('click', handleKeyDetailAccessPreset);
  els.keyDetailAccessSuggestions.addEventListener('click', handleKeyDetailAccessSuggestion);
  els.keyDetailAccessPreview.addEventListener('click', handleKeyDetailAccessSuggestion);
  els.btnKeyDetailAccessClear.addEventListener('click', handleKeyDetailAccessClear);
  els.keyDetailAccessFields.addEventListener('input', handleKeyDetailAccessInput);
  els.keyDetailActions.addEventListener('click', handleKeyAction);
  els.btnRefreshKeys.addEventListener('click', loadApiKeys);
  els.auditForm.addEventListener('submit', handleAuditSubmit);
  els.auditTable.addEventListener('click', handleAuditSelection);
  els.createOutput.addEventListener('click', handleCopyValueClick);
  els.keyActionOutput.addEventListener('click', handleCopyValueClick);
  bindViewNavigation();
}

async function handleCopyValueClick(event) {
  const button = event.target.closest('button[data-copy-value]');
  if (!button) return;

  const value = String(button.dataset.copyValue || '');
  if (!value) return;

  try {
    await navigator.clipboard.writeText(value);
    button.textContent = 'Copied';
    window.setTimeout(() => {
      button.textContent = String(button.dataset.copyLabel || 'Copy Secret');
    }, 1500);
  } catch (_err) {
    button.textContent = 'Copy failed';
  }
}

export async function bootstrapAdminConsole() {
  bindEvents();
  setStatus(els.loginStatus, 'checking session...', null);
  setActiveView('overview');

  try {
    const user = await fetchCurrentSession();
    if (!user) {
      redirectToLogin();
      return;
    }
    setStatus(els.loginStatus, 'session ready', true);
    await loadDashboard();
  } catch (_err) {
    setStatus(els.loginStatus, 'token invalid', false);
    redirectToLogin();
  }
}
