/**
 * controlTower.js
 * Program Control Tower — risk monitoring, alerts, lead time watchlist.
 */

const ControlTower = (() => {

  function _riskBadge(r) {
    const cls = r === 'High' ? 'badge-danger' : r === 'Medium' ? 'badge-warning' : 'badge-success';
    return `<span class="badge ${cls}"><span class="badge-dot"></span>${r}</span>`;
  }
  function _statusBadge(s) {
    if (['Operational', 'AIS Capitalized', 'Qualified', 'Capitalized'].includes(s)) return `<span class="badge badge-success"><span class="badge-dot"></span>${s}</span>`;
    if (s === 'Delayed') return `<span class="badge badge-danger"><span class="badge-dot"></span>${s}</span>`;
    return `<span class="badge badge-warning"><span class="badge-dot"></span>${s}</span>`;
  }
  function _fmt$(n) { return '$' + Number(n || 0).toLocaleString(); }

  function render(data) {
    _renderKPIs(data);
    _renderRiskRadar(data);
    _renderLeadTimeWatchlist(data);
    _renderAlerts(data);
    _renderTimeline(data);
  }

  function _renderKPIs(data) {
    const critical = data.filter(r => r.priority === 'P1' && r.risk === 'High').length;
    const delayed = data.filter(r => r.install_status === 'Delayed').length;
    const highLead = data.filter(r => r.lead_time_weeks > 30).length;
    const atRisk = data.filter(r => r.risk === 'High' || r.risk === 'Medium').length;

    _set('ct-critical', critical);
    _set('ct-delayed', delayed);
    _set('ct-high-lead', highLead);
    _set('ct-at-risk', atRisk);
  }

  function _renderRiskRadar(data) {
    const container = document.getElementById('risk-radar-tbody');
    if (!container) return;

    // P1 High-risk tools, delayed, or lead > 30
    const filtered = data.filter(r =>
      r.priority === 'P1' || r.risk === 'High' ||
      r.install_status === 'Delayed' || r.lead_time_weeks > 30
    );

    // Score: P1=3, High=2, Delayed=2, LeadTime>30=1
    const scored = filtered.map(r => ({
      ...r,
      score: (r.priority === 'P1' ? 3 : 0) + (r.risk === 'High' ? 2 : 0) +
             (r.install_status === 'Delayed' ? 2 : 0) + (r.lead_time_weeks > 30 ? 1 : 0),
    })).sort((a, b) => b.score - a.score).slice(0, 10);

    container.innerHTML = scored.map(r => `
      <tr>
        <td style="font-size:10px;color:var(--text-tertiary);">${r.tool_id}</td>
        <td><div style="font-weight:600;">${r.tool_type}</div><div style="font-size:9px;color:var(--text-tertiary);">${r.site}</div></td>
        <td>${r.program}</td>
        <td><span class="badge ${r.priority === 'P1' ? 'badge-danger' : r.priority === 'P2' ? 'badge-warning' : 'badge-neutral'}">${r.priority}</span></td>
        <td>${_statusBadge(r.install_status)}</td>
        <td>${_riskBadge(r.risk)}</td>
        <td style="${r.lead_time_weeks > 30 ? 'color:var(--accent-red);font-weight:600;' : ''}">${r.lead_time_weeks}w</td>
        <td class="numeric">${_fmt$(r.budget)}</td>
        <td><div class="progress-cell"><div class="progress-bar"><div class="progress-fill ${r.deploy_pct >= 80 ? 'success' : r.deploy_pct >= 50 ? 'warning' : 'danger'}" style="width:${r.deploy_pct}%"></div></div><span class="progress-text">${r.deploy_pct}%</span></div></td>
      </tr>
    `).join('') || '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-tertiary);">No high-risk tools found with current filters.</td></tr>';
  }

  function _renderLeadTimeWatchlist(data) {
    const container = document.getElementById('lead-watchlist');
    if (!container) return;

    const top5 = [...data].sort((a, b) => b.lead_time_weeks - a.lead_time_weeks).slice(0, 5);
    const maxLead = top5[0]?.lead_time_weeks || 1;

    container.innerHTML = top5.map(r => `
      <div class="stat-bar-row">
        <div class="stat-bar-label"><strong>${r.tool_id}</strong> — ${r.tool_type}</div>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${(r.lead_time_weeks / maxLead) * 100}%;background:${r.lead_time_weeks > 35 ? 'var(--accent-red)' : r.lead_time_weeks > 28 ? 'var(--accent-amber)' : 'var(--accent-blue)'}"></div></div>
        <div class="stat-bar-value">${r.lead_time_weeks}w</div>
      </div>
    `).join('');
  }

  function _renderAlerts(data) {
    const container = document.getElementById('deployment-alerts');
    if (!container) return;

    const alerts = data.filter(r =>
      (r.deploy_pct < 50 && r.phase === 'PVT') ||
      r.install_status === 'Delayed'
    ).slice(0, 8);

    if (alerts.length === 0) {
      container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:11px;">No active deployment alerts.</div>`;
      return;
    }

    container.innerHTML = alerts.map(r => {
      const isDelayed = r.install_status === 'Delayed';
      const isPVT = r.phase === 'PVT' && r.deploy_pct < 50;
      const icon = isDelayed ? '⚠' : '◉';
      const msg = isDelayed
        ? `Installation delayed — lead time ${r.lead_time_weeks}w`
        : `PVT phase — only ${r.deploy_pct}% deployed`;
      return `
        <div class="approval-item">
          <div>
            <div style="font-weight:600;font-size:12px;">${icon} ${r.tool_type} — ${r.program}</div>
            <div class="approval-meta">${r.tool_id} · ${r.site} · ${r.oem_vendor}</div>
            <div style="font-size:10px;color:var(--text-secondary);margin-top:3px;">${msg}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-serif);font-size:14px;font-weight:600;">${r.priority}</div>
            ${isDelayed ? '<span class="badge badge-danger"><span class="badge-dot"></span>Delayed</span>' : '<span class="badge badge-warning"><span class="badge-dot"></span>At Risk</span>'}
          </div>
        </div>`;
    }).join('');
  }

  function _renderTimeline(data) {
    const phases = ['EVT', 'DVT', 'PVT'];
    phases.forEach(ph => {
      const bar = document.getElementById(`timeline-${ph.toLowerCase()}`);
      const label = document.getElementById(`timeline-${ph.toLowerCase()}-label`);
      if (!bar) return;

      const group = data.filter(r => r.phase === ph);
      const total = group.length || 1;
      const complete = group.filter(r => ['Operational', 'AIS Capitalized', 'Qualified'].includes(r.install_status)).length;
      const pct = Math.round((complete / total) * 100);

      bar.style.width = pct + '%';
      bar.className = `progress-fill ${pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'}`;
      if (label) label.textContent = pct + '%';
    });
  }

  function _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { render };
})();
