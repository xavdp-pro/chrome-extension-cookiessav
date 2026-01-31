let currentTab = null;
let allCookies = [];
let selectedCookies = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const siteUrl = urlParams.get('url');
    const domain = urlParams.get('domain');
    if (siteUrl && domain) {
      currentTab = { url: siteUrl };
      document.getElementById('current-site').textContent = domain;
      await loadCookies();
    } else {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tabs[0];
      if (currentTab && currentTab.url) {
        const url = new URL(currentTab.url);
        document.getElementById('current-site').textContent = url.hostname;
        await loadCookies();
      } else {
        showStatus('Cannot detect current site. Go to a site and try again.', 'error');
      }
    }
  } catch (error) {
    showStatus('Initialization error', 'error');
  }
  document.getElementById('select-all').addEventListener('click', selectAll);
  document.getElementById('deselect-all').addEventListener('click', deselectAll);
  document.getElementById('save-btn').addEventListener('click', saveSelectedCookies);
  document.getElementById('search-cookies').addEventListener('input', filterCookies);
});

async function loadCookies() {
  if (!currentTab || !currentTab.url) return;
  const domain = new URL(currentTab.url).hostname;
  let cookies = await chrome.cookies.getAll({ domain });
  if (cookies.length === 0) cookies = await chrome.cookies.getAll({ domain: '.' + domain });
  if (cookies.length === 0) {
    const all = await chrome.cookies.getAll({});
    cookies = all.filter(c => c.domain === domain || c.domain === '.' + domain);
  }
  allCookies = cookies;
  document.getElementById('total-cookies').textContent = cookies.length;
  selectedCookies = new Set(cookies.map(c => c.name));
  renderCookieList();
}

function renderCookieList(filter = '') {
  const list = document.getElementById('cookie-list');
  const term = filter.toLowerCase();
  if (allCookies.length === 0) {
    list.innerHTML = '<div class="empty-state">No cookies found for this site</div>';
    updateSelectionCount();
    return;
  }
  const filtered = allCookies.filter(c => !term || c.name.toLowerCase().includes(term) || c.value.toLowerCase().includes(term) || c.domain.toLowerCase().includes(term));
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">No cookies match the search</div>';
    updateSelectionCount();
    return;
  }
  list.innerHTML = filtered.map(c => {
    const sel = selectedCookies.has(c.name);
    const val = c.value.length > 100 ? c.value.substring(0, 100) + '...' : c.value;
    return `<div class="cookie-item ${sel ? 'selected' : ''}" data-cookie-name="${c.name}"><input type="checkbox" class="cookie-checkbox" data-cookie-name="${c.name}" ${sel ? 'checked' : ''}><div class="cookie-info"><div class="cookie-name">${escapeHtml(c.name)}</div><div class="cookie-details"><span class="cookie-detail">Domain: ${escapeHtml(c.domain)}</span><span class="cookie-detail">Path: ${escapeHtml(c.path)}</span>${c.secure ? '<span class="cookie-detail">Secure</span>' : ''}${c.httpOnly ? '<span class="cookie-detail">HttpOnly</span>' : ''}${c.sameSite ? '<span class="cookie-detail">SameSite: ' + c.sameSite + '</span>' : ''}</div><div class="cookie-value">${escapeHtml(val)}</div></div></div>`;
  }).join('');
  list.querySelectorAll('.cookie-checkbox').forEach(cb => {
    cb.addEventListener('change', e => {
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
  document.getElementById('save-btn').disabled = c === 0;
}

async function saveSelectedCookies() {
  if (selectedCookies.size === 0) { showStatus('No cookies selected', 'error'); return; }
  const toSave = allCookies.filter(c => selectedCookies.has(c.name));
  const data = { site: currentTab.url, domain: new URL(currentTab.url).hostname, exportDate: new Date().toISOString(), cookieCount: toSave.length, cookies: toSave.map(c => ({ name: c.name, value: c.value, domain: c.domain, path: c.path, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite, expirationDate: c.expirationDate })) };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `cookies_${new URL(currentTab.url).hostname}_${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
  showStatus(`✅ ${toSave.length} cookie(s) saved successfully!`, 'success');
}
function showStatus(msg, type) { const s = document.getElementById('status'); s.textContent = msg; s.className = `status ${type}`; if (type === 'success') setTimeout(() => { s.className = 'status'; s.textContent = ''; }, 5000); }
function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
