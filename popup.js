// Get current tab and load cookies
let currentTab = null;
let allCookies = [];
let selectedCookies = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    if (currentTab && currentTab.url) {
      const url = new URL(currentTab.url);
      document.getElementById('current-site').textContent = url.hostname;
      await loadCookies();
    } else {
      showStatus('Impossible de détecter le site actuel', 'error');
    }
  } catch (error) {
    showStatus('Erreur lors de l\'initialisation', 'error');
  }
  document.getElementById('select-btn').addEventListener('click', openCookiesPage);
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('select-all').addEventListener('click', selectAll);
  document.getElementById('deselect-all').addEventListener('click', deselectAll);
  document.getElementById('save-selected-btn').addEventListener('click', saveSelectedCookies);
  document.getElementById('search-cookies').addEventListener('input', filterCookies);
  document.getElementById('cookie-modal').addEventListener('click', (e) => {
    if (e.target.id === 'cookie-modal') closeModal();
  });
});

async function loadCookies() {
  if (!currentTab || !currentTab.url) return;
  const url = new URL(currentTab.url);
  const cookies = await chrome.cookies.getAll({ domain: url.hostname });
  allCookies = cookies;
  document.getElementById('total-cookies').textContent = cookies.length;
  document.getElementById('stats').style.display = 'block';
  selectedCookies = new Set(cookies.map(c => c.name));
}

async function openCookiesPage() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (tab && tab.url) {
    const u = new URL(tab.url);
    chrome.tabs.create({ url: chrome.runtime.getURL(`cookies.html?url=${encodeURIComponent(tab.url)}&domain=${encodeURIComponent(u.hostname)}`) });
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL('cookies.html') });
  }
}

function closeModal() {
  document.getElementById('cookie-modal').classList.remove('active');
  document.getElementById('search-cookies').value = '';
}

function renderCookieList(filter = '') {
  const cookieList = document.getElementById('cookie-list');
  const searchTerm = filter.toLowerCase();
  if (allCookies.length === 0) {
    cookieList.innerHTML = '<div class="empty-state">Aucun cookie trouvé</div>';
    return;
  }
  const filtered = allCookies.filter(c => !searchTerm || c.name.toLowerCase().includes(searchTerm) || c.value.toLowerCase().includes(searchTerm) || c.domain.toLowerCase().includes(searchTerm));
  if (filtered.length === 0) {
    cookieList.innerHTML = '<div class="empty-state">Aucun cookie ne correspond</div>';
    return;
  }
  cookieList.innerHTML = filtered.map(cookie => {
    const sel = selectedCookies.has(cookie.name);
    const val = cookie.value.length > 50 ? cookie.value.substring(0, 50) + '...' : cookie.value;
    return `<div class="cookie-item ${sel ? 'selected' : ''}" data-cookie-name="${cookie.name}"><input type="checkbox" class="cookie-checkbox" data-cookie-name="${cookie.name}" ${sel ? 'checked' : ''}><div class="cookie-info"><div class="cookie-name">${escapeHtml(cookie.name)}</div><div class="cookie-details"><span class="cookie-detail">Domain: ${escapeHtml(cookie.domain)}</span><span class="cookie-detail">Path: ${escapeHtml(cookie.path)}</span>${cookie.secure ? '<span class="cookie-detail">Secure</span>' : ''}${cookie.httpOnly ? '<span class="cookie-detail">HttpOnly</span>' : ''}${cookie.sameSite ? `<span class="cookie-detail">SameSite: ${cookie.sameSite}</span>` : ''}</div><div class="cookie-value">${escapeHtml(val)}</div></div></div>`;
  }).join('');
  cookieList.querySelectorAll('.cookie-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const n = e.target.dataset.cookieName;
      if (e.target.checked) selectedCookies.add(n); else selectedCookies.delete(n);
      e.target.closest('.cookie-item').classList.toggle('selected', e.target.checked);
      updateSelectionCount();
    });
  });
  updateSelectionCount();
}

function filterCookies(e) { renderCookieList(e.target.value); }
function selectAll() { allCookies.forEach(c => selectedCookies.add(c.name)); renderCookieList(document.getElementById('search-cookies').value); }
function deselectAll() { selectedCookies.clear(); renderCookieList(document.getElementById('search-cookies').value); }
function updateSelectionCount() {
  const c = selectedCookies.size;
  document.getElementById('selected-count').textContent = c;
  document.getElementById('save-count').textContent = c;
  document.getElementById('save-selected-btn').disabled = c === 0;
}

async function saveSelectedCookies() {
  if (selectedCookies.size === 0) { showStatus('Aucun cookie sélectionné', 'error'); return; }
  const toSave = allCookies.filter(c => selectedCookies.has(c.name));
  const data = { site: currentTab.url, domain: new URL(currentTab.url).hostname, exportDate: new Date().toISOString(), cookieCount: toSave.length, cookies: toSave.map(c => ({ name: c.name, value: c.value, domain: c.domain, path: c.path, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite, expirationDate: c.expirationDate })) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cookies_${new URL(currentTab.url).hostname}_${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
  showStatus(`✅ ${toSave.length} cookie(s) sauvegardé(s)!`, 'success');
  closeModal();
}
function showStatus(msg, type) { const s = document.getElementById('status'); s.textContent = msg; s.className = `status ${type}`; if (type === 'success') setTimeout(() => { s.className = 'status'; s.textContent = ''; }, 3000); }
function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
