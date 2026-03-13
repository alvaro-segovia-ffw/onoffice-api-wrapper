'use strict';

(function bootstrapSessionNav() {
  const root = document.querySelector('[data-nav-session]');
  if (!root) return;

  const loginLink = root.querySelector('[data-nav-login]');
  const dashboardLink = root.querySelector('[data-nav-dashboard]');
  const logoutButton = root.querySelector('[data-nav-logout]');
  const userBadge = root.querySelector('[data-nav-user]');

  function showLoggedOut() {
    if (loginLink) loginLink.hidden = false;
    if (dashboardLink) dashboardLink.hidden = true;
    if (logoutButton) logoutButton.hidden = true;
    if (userBadge) {
      userBadge.hidden = true;
      userBadge.textContent = '';
    }
  }

  function showLoggedIn(user) {
    if (loginLink) loginLink.hidden = true;
    if (dashboardLink) dashboardLink.hidden = false;
    if (logoutButton) logoutButton.hidden = false;
    if (userBadge) {
      const roles = Array.isArray(user?.roles) ? user.roles.join(', ') : '';
      userBadge.hidden = false;
      userBadge.textContent = roles ? `${user.email} · ${roles}` : user.email || 'Active session';
    }
  }

  async function loadSession() {
    try {
      const res = await fetch('/admin/session', { credentials: 'include' });
      if (!res.ok) {
        showLoggedOut();
        return;
      }

      const payload = await res.json().catch(() => ({}));
      if (!payload?.user) {
        showLoggedOut();
        return;
      }

      showLoggedIn(payload.user);
    } catch (_err) {
      showLoggedOut();
    }
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await fetch('/admin/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
      showLoggedOut();
      window.location.href = '/';
    });
  }

  showLoggedOut();
  loadSession();
})();
