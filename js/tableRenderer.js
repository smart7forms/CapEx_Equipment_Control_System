/**
 * tableRenderer.js
 * Renders sortable, paginated data tables.
 */

const TableRenderer = (() => {
  const PAGE_SIZE = 15;
  const _state = {};

  function _fmt$(n) {
    if (!n && n !== 0) return '—';
    return '$' + Number(n).toLocaleString();
  }

  function _riskBadge(r) {
    const cls = r === 'High' ? 'badge-danger' : r === 'Medium' ? 'badge-warning' : 'badge-success';
    return `<span class="badge ${cls}"><span class="badge-dot"></span>${r}</span>`;
  }

  function _statusBadge(s) {
    const opStatuses = ['Operational', 'AIS Capitalized', 'Qualified', 'Capitalized'];
    const warnStatuses = ['Installed', 'OEM Build', 'PO Issued', 'In Progress'];
    const dangerStatuses = ['Delayed'];
    if (opStatuses.includes(s)) return `<span class="badge badge-success"><span class="badge-dot"></span>${s}</span>`;
    if (dangerStatuses.includes(s)) return `<span class="badge badge-danger"><span class="badge-dot"></span>${s}</span>`;
    if (warnStatuses.includes(s)) return `<span class="badge badge-warning"><span class="badge-dot"></span>${s}</span>`;
    return `<span class="badge badge-neutral">${s}</span>`;
  }

  function _progressCell(pct) {
    const cls = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger';
    return `<div class="progress-cell"><div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div><span class="progress-text">${pct}%</span></div>`;
  }

  function _varCell(v) {
    const color = v <= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    const sign = v > 0 ? '+' : '';
    return `<span style="color:${color};font-weight:600;">${sign}${_fmt$(v)}</span>`;
  }

  // Equipment Registry Table
  function renderRegistry(data, containerId) {
    const key = 'registry';
    if (!_state[key]) _state[key] = { page: 1, sortCol: 'tool_id', sortDir: 1, activeTab: 'all' };

    const s = _state[key];
    const container = document.getElementById(containerId);
    if (!container) return;

    // Tab filter
    let filtered = data;
    if (s.activeTab === 'operational') filtered = data.filter(r => ['Operational', 'AIS Capitalized'].includes(r.install_status));
    else if (s.activeTab === 'pipeline') filtered = data.filter(r => ['Installed', 'OEM Build', 'PO Issued', 'Demand Identified'].includes(r.install_status));
    else if (s.activeTab === 'delayed') filtered = data.filter(r => r.install_status === 'Delayed');
    else if (s.activeTab === 'ais') filtered = data.filter(r => r.ais_status !== 'Capitalized');

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let av = a[s.sortCol], bv = b[s.sortCol];
      if (typeof av === 'number') return s.sortDir * (av - bv);
      return s.sortDir * String(av || '').localeCompare(String(bv || ''));
    });

    const total = filtered.length;
    const pages = Math.ceil(total / PAGE_SIZE);
    s.page = Math.min(s.page, pages || 1);
    const slice = filtered.slice((s.page - 1) * PAGE_SIZE, s.page * PAGE_SIZE);

    // Update tab counts
    const allBtn = document.querySelector('[data-tab="all"]');
    if (allBtn) {
      document.querySelector('[data-tab="all"]').textContent = `All Tools (${data.length})`;
      document.querySelector('[data-tab="operational"]').textContent = `Operational (${data.filter(r => ['Operational', 'AIS Capitalized'].includes(r.install_status)).length})`;
      document.querySelector('[data-tab="pipeline"]').textContent = `In Pipeline (${data.filter(r => ['Installed', 'OEM Build', 'PO Issued', 'Demand Identified'].includes(r.install_status)).length})`;
      document.querySelector('[data-tab="delayed"]').textContent = `Delayed (${data.filter(r => r.install_status === 'Delayed').length})`;
      document.querySelector('[data-tab="ais"]').textContent = `AIS Pending (${data.filter(r => r.ais_status !== 'Capitalized').length})`;
    }

    const cols = [
      { key: 'tool_id', label: 'Tool ID' },
      { key: 'tool_type', label: 'Tool Type' },
      { key: 'site', label: 'Site' },
      { key: 'oem_vendor', label: 'OEM Vendor' },
      { key: 'program', label: 'Program' },
      { key: 'budget', label: 'Budget', numeric: true },
      { key: 'actual', label: 'Actual', numeric: true },
      { key: 'install_status', label: 'CapEx Status' },
      { key: 'install_date', label: 'Install Date' },
      { key: 'qual_date', label: 'Qual Date' },
      { key: 'ais_date', label: 'AIS Date' },
      { key: 'utilization', label: 'Util%', numeric: true },
      { key: 'lead_time_weeks', label: 'Lead Time', numeric: true },
      { key: 'deploy_pct', label: 'Deploy', numeric: true },
    ];

    const arrow = col => col === s.sortCol ? (s.sortDir === 1 ? ' ↑' : ' ↓') : '';

    const thead = `<tr>${cols.map(c => `<th class="${c.numeric ? 'numeric' : ''}" style="cursor:pointer;" data-sort="${c.key}">${c.label}${arrow(c.key)}</th>`).join('')}</tr>`;
    const tbody = slice.map(r => `<tr>
      <td style="font-size:10px;color:var(--text-tertiary);">${r.tool_id}</td>
      <td><div style="font-weight:600;">${r.tool_type}</div><div style="font-size:9px;color:var(--text-tertiary);">${r.tool_model || ''}</div></td>
      <td>${r.site}</td>
      <td>${r.oem_vendor}</td>
      <td>${r.program}</td>
      <td class="numeric">${_fmt$(r.budget)}</td>
      <td class="numeric">${_fmt$(r.actual)}</td>
      <td>${_statusBadge(r.install_status)}</td>
      <td>${r.install_date || '—'}</td>
      <td>${r.qual_date || '—'}</td>
      <td>${r.ais_date || '—'}</td>
      <td style="color:${r.utilization >= 75 ? 'var(--accent-green)' : 'var(--accent-amber)'};">${r.utilization}%</td>
      <td>${r.lead_time_weeks}w</td>
      <td>${_progressCell(r.deploy_pct)}</td>
    </tr>`).join('');

    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="data-table" id="reg-table">
          <thead>${thead}</thead>
          <tbody>${tbody || '<tr><td colspan="14" style="text-align:center;padding:24px;color:var(--text-tertiary);">No records match current filters.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="pagination">
        <span class="page-info">Showing ${total === 0 ? 0 : (s.page - 1) * PAGE_SIZE + 1}–${Math.min(s.page * PAGE_SIZE, total)} of ${total} tools</span>
        <div>${_pageBtns(s.page, pages, 'registry')}</div>
      </div>`;

    // Sort click
    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (s.sortCol === col) s.sortDir *= -1; else { s.sortCol = col; s.sortDir = 1; }
        s.page = 1;
        renderRegistry(data, containerId);
      });
    });
  }

  // Capitalization Table
  function renderCapitalization(data, containerId) {
    const key = 'cap';
    if (!_state[key]) _state[key] = { page: 1, sortCol: 'tool_id', sortDir: 1 };
    const s = _state[key];
    const container = document.getElementById(containerId);
    if (!container) return;

    const filtered = [...data].sort((a, b) => {
      let av = a[s.sortCol], bv = b[s.sortCol];
      if (typeof av === 'number') return s.sortDir * (av - bv);
      return s.sortDir * String(av || '').localeCompare(String(bv || ''));
    });

    const total = filtered.length;
    const pages = Math.ceil(total / PAGE_SIZE);
    s.page = Math.min(s.page, pages || 1);
    const slice = filtered.slice((s.page - 1) * PAGE_SIZE, s.page * PAGE_SIZE);

    const tbody = slice.map(r => `<tr>
      <td style="font-size:10px;">${r.tool_id}</td>
      <td>${r.tool_type}</td>
      <td>${r.site}</td>
      <td>${r.install_date || '—'}</td>
      <td>${r.ais_date || '—'}</td>
      <td class="numeric">${_fmt$(r.actual)}</td>
      <td>${r.asset_class}</td>
      <td>${r.ais_date !== 'TBD' && r.ais_date ? r.ais_date : 'TBD'}</td>
      <td>${r.useful_life_yr} yr</td>
      <td>${_statusBadge(r.ais_status)}</td>
    </tr>`).join('');

    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr>
            <th>Tool ID</th><th>Tool Type</th><th>Site</th><th>Install Date</th>
            <th>AIS Date</th><th class="numeric">Asset Value</th><th>Asset Class</th>
            <th>Depr. Start</th><th>Depr. Life</th><th>Status</th>
          </tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
      <div class="pagination">
        <span class="page-info">Showing ${(s.page - 1) * PAGE_SIZE + 1}–${Math.min(s.page * PAGE_SIZE, total)} of ${total} tools</span>
        <div>${_pageBtns(s.page, pages, 'cap')}</div>
      </div>`;
  }

  function _pageBtns(current, total, key) {
    if (total <= 1) return '';
    let html = '';
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    if (start > 1) html += `<button class="page-btn" data-page="1" data-key="${key}">1</button>`;
    if (start > 2) html += `<span style="padding:0 4px;">…</span>`;
    for (let i = start; i <= end; i++) {
      html += `<button class="page-btn${i === current ? ' active' : ''}" data-page="${i}" data-key="${key}">${i}</button>`;
    }
    if (end < total - 1) html += `<span style="padding:0 4px;">…</span>`;
    if (end < total) html += `<button class="page-btn" data-page="${total}" data-key="${key}">${total}</button>`;
    return html;
  }

  // Global page button handler
  document.addEventListener('click', e => {
    const btn = e.target.closest('.page-btn[data-page]');
    if (!btn) return;
    const key = btn.dataset.key;
    const page = parseInt(btn.dataset.page);
    if (_state[key]) {
      _state[key].page = page;
      // Re-trigger from app
      document.dispatchEvent(new CustomEvent('table-page-change', { detail: { key, page } }));
    }
  });

  function setTab(key, tab) {
    if (!_state[key]) _state[key] = { page: 1, sortCol: 'tool_id', sortDir: 1 };
    _state[key].activeTab = tab;
    _state[key].page = 1;
  }

  return { renderRegistry, renderCapitalization, setTab };
})();
