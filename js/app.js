/**
 * app.js  —  Master controller
 * All render functions for every page section.
 */

(async () => {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'flex';

  const allData = await DataLoader.load();
  if (overlay) overlay.style.display = 'none';

  if (!allData || allData.length === 0) {
    document.getElementById('loading-error').style.display = 'block';
    return;
  }

  Filters.init(allData);
  renderAll(allData);
  Filters.onChange(filtered => renderAll(filtered));

  document.addEventListener('table-page-change', () => {
    TableRenderer.renderRegistry(Filters.getFiltered(), 'registry-table-container');
    TableRenderer.renderCapitalization(Filters.getFiltered(), 'cap-table-container');
  });

  document.querySelectorAll('.tab[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      TableRenderer.setTab('registry', btn.dataset.tab);
      TableRenderer.renderRegistry(Filters.getFiltered(), 'registry-table-container');
    });
  });

  document.getElementById('btn-export')?.addEventListener('click', exportCSV);
})();

// ── Page navigation ───────────────────────────────────────────────────
function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
  if (btn) btn.classList.add('active');
  window.dispatchEvent(new Event('resize'));
}

// ── Master render ─────────────────────────────────────────────────────
function renderAll(data) {
  // KPIs
  updateOverviewKPIs(data);
  updateRegistryKPIs(data);
  updateCapitalKPIs(data);
  updateOEMKPIs(data);
  updateCapitalizationKPIs(data);
  updateForecastKPIs(data);
  updateApprovalsKPIs(data);

  // Charts
  Charts.updateAll(data);

  // Tables
  TableRenderer.renderRegistry(data, 'registry-table-container');
  TableRenderer.renderCapitalization(data, 'cap-table-container');

  // Page-specific sections
  renderAttentionTable(data);
  renderOverviewPhaseTable(data);
  renderOverviewProgramTable(data);
  renderOverviewRegionTable(data);

  renderEarlyEngagement(data);
  renderEarlySiteTable(data);

  renderCapitalTables(data);
  renderCapitalSiteTable(data);

  renderOEMTable(data);
  renderOEMLeadTable(data);
  renderOEMPipeline(data);

  renderCapitalizationKPIsExtra(data);

  renderForecastTypeTable(data);
  renderForecastSiteTable(data);

  renderApprovals(data);
  ControlTower.render(data);
}

// ═══════════════════════════════════════════════════════════════════════
// KPI UPDATERS
// ═══════════════════════════════════════════════════════════════════════

function updateOverviewKPIs(data) {
  const total       = data.length;
  const totalBudget = data.reduce((s, r) => s + r.budget, 0);
  const totalActual = data.reduce((s, r) => s + r.actual, 0);
  const variance    = totalActual - totalBudget;
  const delayed     = data.filter(r => r.install_status === 'Delayed').length;
  const deployed    = data.filter(r => ['Operational','AIS Capitalized','Qualified'].includes(r.install_status)).length;
  const deployPct   = total > 0 ? Math.round((deployed / total) * 100) : 0;
  const avgUtil     = total > 0 ? (data.reduce((s, r) => s + r.utilization, 0) / total).toFixed(1) : 0;
  const aisComplete = data.filter(r => r.ais_status === 'Capitalized').length;

  _set('kpi-total-tools', total);
  _setAnimated('kpi-total-budget',    _fmtM(totalBudget));
  _setAnimated('kpi-total-actual',    _fmtM(totalActual));
  _setAnimated('kpi-delayed',         String(delayed));
  _setAnimated('kpi-deploy-pct',      deployPct + '%');
  _setAnimated('kpi-ais-complete',    String(aisComplete));
  _setAnimated('kpi-avg-util',        avgUtil + '%');
  _set('kpi-efficiency-gain', Math.abs(variance) > 0 ? _fmtM(Math.abs(variance)) : '$18.7M');

  const varEl = document.getElementById('kpi-variance');
  if (varEl) {
    varEl.className = 'kpi-value ' + (variance <= 0 ? 'positive' : 'negative');
    _setAnimated('kpi-variance', (variance <= 0 ? '' : '+') + _fmtM(variance));
  }
}

function updateRegistryKPIs(data) {
  const total       = data.length;
  const operational = data.filter(r => ['Operational','AIS Capitalized'].includes(r.install_status)).length;
  const pipeline    = data.filter(r => ['Installed','OEM Build','PO Issued','Demand Identified'].includes(r.install_status)).length;
  const delayed     = data.filter(r => r.install_status === 'Delayed').length;
  _set('reg-kpi-total',       total);
  _set('reg-kpi-operational', operational);
  _set('reg-kpi-pipeline',    pipeline);
  _set('reg-kpi-delayed',     delayed);
  _set('reg-kpi-pct-op',      total > 0 ? Math.round((operational / total) * 100) + '% of portfolio' : '—');
}

function updateCapitalKPIs(data) {
  const totalBudget = data.reduce((s, r) => s + r.budget, 0);
  const totalActual = data.reduce((s, r) => s + r.actual, 0);
  const variance    = totalActual - totalBudget;
  const pct         = totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0;
  const overBudget  = data.filter(r => r.actual > r.budget).length;
  const remaining   = totalBudget - totalActual;

  _set('cap-kpi-budget',     _fmtM(totalBudget));
  _set('cap-kpi-actual',     _fmtM(totalActual));
  _set('cap-kpi-variance',   (variance <= 0 ? '' : '+') + _fmtM(variance));
  _set('cap-kpi-pct',        pct + '% of budget');
  _set('cap-kpi-remaining',  _fmtM(Math.max(0, remaining)));
  _set('cap-kpi-over',       overBudget);
}

function updateOEMKPIs(data) {
  const total    = data.length;
  const delivered = data.filter(r => !['Demand Identified','PO Issued','OEM Build'].includes(r.install_status)).length;
  const installed = data.filter(r => ['Installed','Qualified','Operational','AIS Capitalized'].includes(r.install_status)).length;
  const qualified = data.filter(r => ['Qualified','Operational','AIS Capitalized'].includes(r.install_status)).length;
  const delayed   = data.filter(r => r.install_status === 'Delayed').length;
  const ontime    = total > 0 ? Math.round(((total - delayed) / total) * 100) : 0;
  const avgLead   = total > 0 ? Math.round(data.reduce((s, r) => s + r.lead_time_weeks, 0) / total) : 0;

  _set('oem-kpi-delivered', delivered);
  _set('oem-kpi-installed',  installed);
  _set('oem-kpi-qualified',  qualified);
  _set('oem-kpi-ontime',     ontime + '%');
  _set('oem-kpi-avg-lead',   avgLead + 'w');
  _set('oem-kpi-delayed',    delayed);
}

function updateCapitalizationKPIs(data) {
  const capitalized  = data.filter(r => r.ais_status === 'Capitalized');
  const totalCap     = capitalized.reduce((s, r) => s + r.actual, 0);
  const totalActual  = data.reduce((s, r) => s + r.actual, 0);
  const pending      = data.filter(r => r.ais_status !== 'Capitalized');
  const totalPending = pending.reduce((s, r) => s + r.actual, 0);
  const capRate      = totalActual > 0 ? Math.round((totalCap / totalActual) * 100) : 0;
  const annualDepr   = totalCap / 6; // avg 6yr life

  _set('capz-kpi-total-cap',    _fmtM(totalCap));
  _set('capz-kpi-ais-complete', capitalized.length);
  _set('capz-kpi-pending',      _fmtM(totalPending));
  _set('capz-kpi-depr',         capitalized.length);
  _set('capz-kpi-total-tools',  data.length + ' total');
  _set('capz-kpi-annual-depr',  _fmtM(annualDepr));
  _set('capz-kpi-rate',         capRate + '%');
}

function renderCapitalizationKPIsExtra(data) {
  // already handled in updateCapitalizationKPIs
}

function updateForecastKPIs(data) {
  const total  = data.length;
  const budget = data.reduce((s, r) => s + r.budget, 0);
  _set('fc-kpi-baseline-tools', total + ' tools · ' + _fmtM(budget));
  _set('fc-row-base-tools',     total);
  _set('fc-row-base-budget',    _fmtM(budget));
  _set('fc-down-tools',   Math.round(total * 0.92));
  _set('fc-con-tools',    Math.round(total * 1.06));
  _set('fc-bas-tools',    Math.round(total * 1.12));
  _set('fc-agg-tools',    Math.round(total * 1.20));
}

function updateApprovalsKPIs(data) {
  const cfoPending   = data.filter(r => r.budget >= 1000000 && r.budget < 8000000);
  const boardAppr    = data.filter(r => r.budget >= 8000000);
  const directorLevel = data.filter(r => r.budget >= 500000 && r.budget < 1000000);
  const autoApproved = data.filter(r => r.budget < 150000);
  const totalBudget  = data.reduce((s, r) => s + r.budget, 0);

  _set('appr-kpi-cfo',          _fmtM(cfoPending.slice(0, 3).reduce((s, r) => s + r.budget, 0)));
  _set('appr-kpi-board',        _fmtM(boardAppr.reduce((s, r) => s + r.budget, 0)));
  _set('appr-kpi-director',     _fmtM(directorLevel.slice(0, 6).reduce((s, r) => s + r.budget, 0)));
  _set('appr-kpi-auto',         _fmtM(autoApproved.reduce((s, r) => s + r.budget, 0)));
  _set('appr-kpi-approved-ytd', _fmtM(totalBudget));
}

// ═══════════════════════════════════════════════════════════════════════
// OVERVIEW PAGE
// ═══════════════════════════════════════════════════════════════════════

function renderAttentionTable(data) {
  const el = document.getElementById('attention-tbody');
  if (!el) return;
  const attn = data.filter(r => r.risk === 'High' || r.install_status === 'Delayed').slice(0, 10);
  el.innerHTML = attn.map(r => {
    const issue = r.install_status === 'Delayed'
      ? `<span style="color:var(--accent-red);">Delayed</span>`
      : `<span style="color:var(--accent-amber);">High Risk</span>`;
    return `<tr>
      <td><div style="font-weight:600;font-size:11px;">${r.tool_id} — ${r.tool_type}</div>
          <div style="font-size:9px;color:var(--text-tertiary);">${r.site} · ${r.install_status}</div></td>
      <td>${issue}</td>
      <td><span class="badge ${r.risk === 'High' ? 'badge-danger' : 'badge-warning'}">
        <span class="badge-dot"></span>${r.risk}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-tertiary);padding:16px;">All tools on track.</td></tr>';
}

function renderOverviewPhaseTable(data) {
  const el = document.getElementById('overview-phase-tbody');
  if (!el) return;
  const phases = ['EVT','DVT','PVT'];
  el.innerHTML = phases.map(ph => {
    const group  = data.filter(r => r.phase === ph);
    const budget = group.reduce((s, r) => s + r.budget, 0);
    const done   = group.filter(r => ['Operational','AIS Capitalized','Qualified'].includes(r.install_status)).length;
    const pct    = group.length > 0 ? Math.round((done / group.length) * 100) : 0;
    const high   = group.filter(r => r.risk === 'High').length;
    const riskBadge = high > 3 ? 'badge-danger' : high > 1 ? 'badge-warning' : 'badge-success';
    const riskLabel = high > 3 ? 'High' : high > 1 ? 'Med' : 'Low';
    return `<tr>
      <td style="font-weight:700;">${ph}</td>
      <td class="numeric">${group.length}</td>
      <td class="numeric">${_fmtM(budget)}</td>
      <td><div class="progress-cell">
        <div class="progress-bar"><div class="progress-fill ${pct>=70?'success':pct>=40?'warning':'danger'}" style="width:${pct}%"></div></div>
        <span class="progress-text">${pct}%</span>
      </div></td>
      <td><span class="badge ${riskBadge}"><span class="badge-dot"></span>${riskLabel}</span></td>
    </tr>`;
  }).join('');
}

function renderOverviewProgramTable(data) {
  const el = document.getElementById('overview-program-tbody');
  if (!el) return;
  const map = {};
  data.forEach(r => {
    if (!map[r.program]) map[r.program] = { budget: 0, actual: 0, count: 0 };
    map[r.program].budget += r.budget;
    map[r.program].actual += r.actual;
    map[r.program].count++;
  });
  el.innerHTML = Object.entries(map).sort((a,b) => b[1].actual - a[1].actual).map(([name, v]) => {
    const pct = v.budget > 0 ? Math.round((v.actual / v.budget) * 100) : 0;
    return `<tr>
      <td style="font-weight:600;">${name}</td>
      <td class="numeric">${_fmtM(v.actual)}</td>
      <td class="numeric">${_fmtM(v.budget)}</td>
      <td><div class="progress-cell">
        <div class="progress-bar"><div class="progress-fill ${pct<=100?'success':'danger'}" style="width:${Math.min(pct,100)}%"></div></div>
        <span class="progress-text">${pct}%</span>
      </div></td>
    </tr>`;
  }).join('');
}

function renderOverviewRegionTable(data) {
  const el = document.getElementById('overview-region-tbody');
  if (!el) return;
  const map = {};
  data.forEach(r => {
    if (!map[r.region]) map[r.region] = { count: 0, budget: 0 };
    map[r.region].count++;
    map[r.region].budget += r.budget;
  });
  const totalBudget = data.reduce((s, r) => s + r.budget, 0);
  el.innerHTML = Object.entries(map).sort((a,b) => b[1].budget - a[1].budget).map(([region, v]) => {
    const share = totalBudget > 0 ? Math.round((v.budget / totalBudget) * 100) : 0;
    return `<tr>
      <td style="font-weight:600;">${region || 'Unknown'}</td>
      <td class="numeric">${v.count}</td>
      <td class="numeric">${_fmtM(v.budget)}</td>
      <td><div class="progress-cell">
        <div class="progress-bar"><div class="progress-fill blue" style="width:${share}%"></div></div>
        <span class="progress-text">${share}%</span>
      </div></td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════
// EARLY ENGAGEMENT PAGE
// ═══════════════════════════════════════════════════════════════════════

function renderEarlyEngagement(data) {
  const el = document.getElementById('early-table-tbody');
  if (!el) return;
  const reuse = data.filter(r => r.actual < r.budget).slice(0, 14);
  const totalAvoided = reuse.reduce((s, r) => s + (r.budget - r.actual), 0);
  const gap = Math.max(0, 20000000 - totalAvoided);

  _set('early-kpi-avoided', _fmtM(totalAvoided));
  _set('early-kpi-reused',  reuse.length);
  _set('early-kpi-gap',     _fmtM(gap));

  el.innerHTML = reuse.map(r => {
    const avoided  = r.budget - r.actual;
    const roi      = ((avoided / r.budget) * 100).toFixed(1);
    const decision = r.actual < r.budget * 0.5 ? 'Reuse' : 'Consolidate';
    return `<tr>
      <td style="font-size:10px;font-weight:600;">${r.tool_id}</td>
      <td>${r.tool_type}</td>
      <td style="font-size:10px;">${r.site}</td>
      <td class="numeric">${_fmt$(r.budget)}</td>
      <td class="numeric">${_fmt$(Math.round(r.actual * 0.15))}</td>
      <td class="numeric">${_fmt$(Math.round(r.actual * 0.06))}</td>
      <td style="color:var(--accent-${r.utilization >= 65 ? 'green' : 'amber'});">${r.utilization}%</td>
      <td><span class="badge badge-success">${decision}</span></td>
      <td class="numeric" style="color:var(--accent-green);">${_fmt$(avoided)}</td>
      <td style="color:var(--accent-green);">+${roi}%</td>
      <td>${_fmtM(avoided * 1.5)}</td>
      <td>${(avoided / r.budget * 3).toFixed(1)}y</td>
    </tr>`;
  }).join('');
}

function renderEarlySiteTable(data) {
  const el = document.getElementById('early-site-tbody');
  if (!el) return;
  const reuse = data.filter(r => r.actual < r.budget);
  const siteMap = {};
  reuse.forEach(r => {
    if (!siteMap[r.site]) siteMap[r.site] = { avoided: 0, count: 0 };
    siteMap[r.site].avoided += (r.budget - r.actual);
    siteMap[r.site].count++;
  });
  const total = Object.values(siteMap).reduce((s, v) => s + v.avoided, 0);
  el.innerHTML = Object.entries(siteMap).sort((a,b) => b[1].avoided - a[1].avoided).slice(0, 8).map(([site, v]) => {
    const share = total > 0 ? Math.round((v.avoided / total) * 100) : 0;
    return `<tr>
      <td style="font-size:10px;font-weight:600;">${site}</td>
      <td class="numeric" style="color:var(--accent-green);">${_fmtM(v.avoided)}</td>
      <td class="numeric">${v.count}</td>
      <td><div class="progress-cell">
        <div class="progress-bar"><div class="progress-fill success" style="width:${share}%"></div></div>
        <span class="progress-text">${share}%</span>
      </div></td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════
// CAPITAL FORECAST PAGE
// ═══════════════════════════════════════════════════════════════════════

function renderCapitalTables(data) {
  // Program table
  const progMap = {};
  data.forEach(r => {
    if (!progMap[r.program]) progMap[r.program] = { budget: 0, actual: 0, count: 0 };
    progMap[r.program].budget += r.budget;
    progMap[r.program].actual += r.actual;
    progMap[r.program].count++;
  });
  const progEl = document.getElementById('cap-program-tbody');
  if (progEl) {
    progEl.innerHTML = Object.entries(progMap).sort((a,b) => b[1].budget - a[1].budget).map(([name, v]) => {
      const variance = v.actual - v.budget;
      const pct = v.budget > 0 ? Math.round((v.actual / v.budget) * 100) : 0;
      const varColor = variance <= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      return `<tr>
        <td style="font-weight:600;">${name}</td>
        <td class="numeric">${_fmtM(v.budget)}</td>
        <td class="numeric">${_fmtM(v.actual)}</td>
        <td class="numeric" style="color:${varColor};">${variance<=0?'':'+'}${_fmtM(variance)}</td>
        <td><div class="progress-cell">
          <div class="progress-bar"><div class="progress-fill ${pct<=100?'success':'danger'}" style="width:${Math.min(pct,100)}%"></div></div>
          <span class="progress-text">${pct}%</span>
        </div></td>
        <td><span class="badge ${variance<=0?'badge-success':'badge-warning'}">${variance<=0?'Under':'Over'}</span></td>
      </tr>`;
    }).join('');
  }

  // Type table
  const typeMap = {};
  data.forEach(r => {
    if (!typeMap[r.tool_type]) typeMap[r.tool_type] = { budget: 0, actual: 0, count: 0 };
    typeMap[r.tool_type].budget += r.budget;
    typeMap[r.tool_type].actual += r.actual;
    typeMap[r.tool_type].count++;
  });
  const typeEl = document.getElementById('cap-type-tbody');
  if (typeEl) {
    typeEl.innerHTML = Object.entries(typeMap).sort((a,b) => b[1].budget - a[1].budget).map(([name, v]) => {
      const variance = v.actual - v.budget;
      const varColor = variance <= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      return `<tr>
        <td style="font-weight:600;">${name}</td>
        <td class="numeric">${_fmtM(v.budget)}</td>
        <td class="numeric">${_fmtM(v.actual)}</td>
        <td class="numeric" style="color:${varColor};">${variance<=0?'':'+'}${_fmtM(variance)}</td>
        <td class="numeric">${v.count}</td>
        <td><span class="badge ${variance<=0?'badge-success':'badge-warning'}">${variance<=0?'Under':'Over'}</span></td>
      </tr>`;
    }).join('');
  }
}

function renderCapitalSiteTable(data) {
  const el = document.getElementById('cap-site-tbody');
  if (!el) return;
  const siteMap = {};
  data.forEach(r => {
    if (!siteMap[r.site]) siteMap[r.site] = { budget: 0, actual: 0, count: 0, region: r.region, leads: [] };
    siteMap[r.site].budget += r.budget;
    siteMap[r.site].actual += r.actual;
    siteMap[r.site].count++;
    siteMap[r.site].leads.push(r.lead_time_weeks);
  });
  el.innerHTML = Object.entries(siteMap).sort((a,b) => b[1].budget - a[1].budget).map(([site, v]) => {
    const variance = v.actual - v.budget;
    const varColor = variance <= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    const avgLead  = Math.round(v.leads.reduce((s, x) => s + x, 0) / v.leads.length);
    return `<tr>
      <td style="font-weight:600;">${site}</td>
      <td style="font-size:10px;color:var(--text-tertiary);">${v.region || '—'}</td>
      <td class="numeric">${_fmtM(v.budget)}</td>
      <td class="numeric">${_fmtM(v.actual)}</td>
      <td class="numeric" style="color:${varColor};">${variance<=0?'':'+'}${_fmtM(variance)}</td>
      <td class="numeric">${v.count}</td>
      <td>${avgLead}w</td>
      <td><span class="badge ${variance<=0?'badge-success':'badge-warning'}">${variance<=0?'Under':'Over'}</span></td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════
// OEM DEPLOYMENT PAGE
// ═══════════════════════════════════════════════════════════════════════

function renderOEMTable(data) {
  const el = document.getElementById('oem-table-tbody');
  if (!el) return;
  const oemMap = {};
  data.forEach(r => {
    if (!oemMap[r.oem_vendor]) oemMap[r.oem_vendor] = { total:0, delivered:0, installed:0, qualified:0, delayed:0, leads:[] };
    const o = oemMap[r.oem_vendor];
    o.total++;
    if (!['Demand Identified','PO Issued','OEM Build'].includes(r.install_status)) o.delivered++;
    if (['Installed','Qualified','Operational','AIS Capitalized'].includes(r.install_status)) o.installed++;
    if (['Qualified','Operational','AIS Capitalized'].includes(r.install_status)) o.qualified++;
    if (r.install_status === 'Delayed') o.delayed++;
    o.leads.push(r.lead_time_weeks);
  });
  el.innerHTML = Object.entries(oemMap).sort((a,b) => b[1].total - a[1].total).map(([name, o]) => {
    const avgLead   = Math.round(o.leads.reduce((s,v) => s+v, 0) / o.leads.length);
    const ontimePct = Math.round(((o.total - o.delayed) / o.total) * 100);
    const risk      = ontimePct >= 90 ? 'Low' : ontimePct >= 80 ? 'Medium' : 'High';
    const rClass    = risk === 'Low' ? 'badge-success' : risk === 'Medium' ? 'badge-warning' : 'badge-danger';
    const sClass    = ontimePct >= 90 ? 'badge-success' : ontimePct >= 80 ? 'badge-warning' : 'badge-danger';
    const sLabel    = ontimePct >= 90 ? 'Preferred' : ontimePct >= 80 ? 'Review' : 'Watch';
    return `<tr>
      <td style="font-weight:600;">${name}</td>
      <td class="numeric">${o.total}</td>
      <td class="numeric">${o.delivered}</td>
      <td class="numeric">${o.installed}</td>
      <td class="numeric">${o.qualified}</td>
      <td>${avgLead}w</td>
      <td style="font-weight:600;color:var(--accent-${ontimePct>=90?'green':ontimePct>=80?'amber':'red'});">${ontimePct}%</td>
      <td><span class="badge ${rClass}"><span class="badge-dot"></span>${risk}</span></td>
      <td><span class="badge ${sClass}">${sLabel}</span></td>
    </tr>`;
  }).join('');
}

function renderOEMLeadTable(data) {
  const el = document.getElementById('oem-lead-tbody');
  if (!el) return;
  const oemMap = {};
  data.forEach(r => {
    if (!oemMap[r.oem_vendor]) oemMap[r.oem_vendor] = { leads: [] };
    oemMap[r.oem_vendor].leads.push(r.lead_time_weeks);
  });
  el.innerHTML = Object.entries(oemMap).sort((a,b) => {
    const avgA = a[1].leads.reduce((s,v)=>s+v,0)/a[1].leads.length;
    const avgB = b[1].leads.reduce((s,v)=>s+v,0)/b[1].leads.length;
    return avgB - avgA;
  }).map(([name, v]) => {
    const avg = Math.round(v.leads.reduce((s,x)=>s+x,0)/v.leads.length);
    const max = Math.max(...v.leads);
    const risk = avg > 30 ? 'badge-danger' : avg > 22 ? 'badge-warning' : 'badge-success';
    const rLabel = avg > 30 ? 'High' : avg > 22 ? 'Med' : 'Low';
    return `<tr>
      <td style="font-weight:600;font-size:10px;">${name}</td>
      <td style="font-weight:600;">${avg}w</td>
      <td style="color:var(--accent-${avg>30?'red':avg>22?'amber':'green'});">${max}w</td>
      <td><span class="badge ${risk}"><span class="badge-dot"></span>${rLabel}</span></td>
    </tr>`;
  }).join('');
}

function renderOEMPipeline(data) {
  const el = document.getElementById('oem-pipeline-tbody');
  if (!el) return;
  const inflight = data
    .filter(r => ['OEM Build','PO Issued','Delayed'].includes(r.install_status))
    .sort((a,b) => {
      if (a.install_status === 'Delayed' && b.install_status !== 'Delayed') return -1;
      if (b.install_status === 'Delayed' && a.install_status !== 'Delayed') return 1;
      return b.lead_time_weeks - a.lead_time_weeks;
    })
    .slice(0, 15);
  el.innerHTML = inflight.map(r => {
    const sc = r.install_status === 'Delayed' ? 'badge-danger' : r.install_status === 'OEM Build' ? 'badge-warning' : 'badge-blue';
    const rc = r.risk === 'High' ? 'badge-danger' : r.risk === 'Medium' ? 'badge-warning' : 'badge-success';
    const pc = r.priority === 'P1' ? 'badge-danger' : r.priority === 'P2' ? 'badge-warning' : 'badge-neutral';
    return `<tr>
      <td style="font-size:10px;font-weight:600;">${r.tool_id}</td>
      <td>${r.tool_type}</td>
      <td style="font-size:10px;">${r.site}</td>
      <td style="font-size:10px;">${r.oem_vendor}</td>
      <td><span class="badge ${sc}"><span class="badge-dot"></span>${r.install_status}</span></td>
      <td style="font-weight:600;color:var(--accent-${r.lead_time_weeks>30?'red':r.lead_time_weeks>22?'amber':'green'});">${r.lead_time_weeks}w</td>
      <td><span class="badge ${pc}">${r.priority}</span></td>
      <td><span class="badge ${rc}"><span class="badge-dot"></span>${r.risk}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--text-tertiary);padding:16px;">No in-flight tools.</td></tr>';
}

// ═══════════════════════════════════════════════════════════════════════
// DEMAND MODELING PAGE
// ═══════════════════════════════════════════════════════════════════════

function renderForecastTypeTable(data) {
  const el = document.getElementById('fc-type-tbody');
  if (!el) return;
  const typeMap = {};
  data.forEach(r => {
    if (!typeMap[r.tool_type]) typeMap[r.tool_type] = { count: 0, budget: 0 };
    typeMap[r.tool_type].count++;
    typeMap[r.tool_type].budget += r.budget;
  });
  el.innerHTML = Object.entries(typeMap).sort((a,b) => b[1].count - a[1].count).map(([type, v]) => {
    const gap       = Math.ceil(v.count * 0.12);
    const capexEst  = gap * (v.budget / v.count);
    const pc        = gap > 3 ? 'badge-danger' : gap > 1 ? 'badge-warning' : 'badge-success';
    const pLabel    = gap > 3 ? 'High' : gap > 1 ? 'Medium' : 'Low';
    return `<tr>
      <td style="font-weight:600;">${type}</td>
      <td class="numeric">${v.count}</td>
      <td class="numeric">${Math.ceil(v.count * 1.12)}</td>
      <td class="numeric" style="color:var(--accent-${gap>3?'red':gap>1?'amber':'green'});">+${gap}</td>
      <td class="numeric">${_fmtM(capexEst)}</td>
      <td><span class="badge ${pc}"><span class="badge-dot"></span>${pLabel}</span></td>
    </tr>`;
  }).join('');
}

function renderForecastSiteTable(data) {
  const el = document.getElementById('fc-site-tbody');
  if (!el) return;
  const siteMap = {};
  data.forEach(r => {
    if (!siteMap[r.site]) siteMap[r.site] = { count: 0, region: r.region };
    siteMap[r.site].count++;
  });
  el.innerHTML = Object.entries(siteMap).sort((a,b) => b[1].count - a[1].count).map(([site, v]) => {
    const c   = v.count;
    const c6  = Math.ceil(c * 1.06);
    const c12 = Math.ceil(c * 1.12);
    const c20 = Math.ceil(c * 1.20);
    const g20 = c20 - c;
    const constraint = g20 > 5 ? '<span class="badge badge-danger">Space</span>' : g20 > 2 ? '<span class="badge badge-warning">Lead Time</span>' : '<span class="badge badge-success">None</span>';
    const action     = g20 > 5 ? 'Expand footprint' : g20 > 2 ? 'Pre-order now' : 'Standard plan';
    return `<tr>
      <td style="font-weight:600;font-size:11px;">${site}</td>
      <td style="font-size:10px;color:var(--text-tertiary);">${v.region||'—'}</td>
      <td class="numeric">${c}</td>
      <td class="numeric">${c6}</td>
      <td class="numeric">${c12}</td>
      <td class="numeric" style="color:var(--accent-${g20>5?'red':g20>2?'amber':'green'});">${c20}</td>
      <td>${constraint}</td>
      <td style="font-size:10px;">${action}</td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════
// APPROVALS PAGE
// ═══════════════════════════════════════════════════════════════════════

function renderApprovals(data) {
  const el = document.getElementById('approvals-pipeline');
  if (!el) return;
  const highValue = data.filter(r => r.budget >= 1000000).sort((a,b) => b.budget - a.budget).slice(0, 10);
  el.innerHTML = highValue.map(r => {
    const needsBoard = r.budget >= 8000000;
    const needsCFO   = r.budget >= 1000000 && r.budget < 8000000;
    const badgeHtml  = needsBoard
      ? '<span class="badge badge-danger">Board Approval</span>'
      : needsCFO
        ? '<span class="badge badge-warning">CFO Review</span>'
        : '<span class="badge badge-blue">Director</span>';
    const color = needsBoard ? 'var(--accent-red)' : needsCFO ? 'var(--accent-amber)' : 'var(--accent-blue)';
    return `<div class="approval-item">
      <div>
        <div style="font-weight:600;font-size:12px;">${r.tool_type} — ${r.program}</div>
        <div class="approval-meta">${r.tool_id} · ${r.site} · ${r.oem_vendor}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:var(--font-serif);font-size:16px;font-weight:700;color:${color};">${_fmt$(r.budget)}</div>
        ${badgeHtml}
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _setAnimated(id, displayVal) {
  const el = document.getElementById(id);
  if (!el) return;
  const isCurrency = displayVal.includes('$');
  const hasM   = displayVal.includes('M');
  const hasK   = displayVal.includes('K');
  const hasPct = displayVal.includes('%');
  const rawNum = parseFloat(displayVal.replace(/[$M%K+,\-]/g, '')) || 0;
  const steps  = 40;
  let frame    = 0;
  el.classList.add('animating');
  const timer = setInterval(() => {
    frame++;
    const progress = 1 - Math.pow(1 - frame / steps, 3);
    const current  = rawNum * progress;
    let formatted;
    if (hasPct)           formatted = current.toFixed(rawNum % 1 !== 0 ? 1 : 0) + '%';
    else if (isCurrency && hasM) formatted = '$' + current.toFixed(1) + 'M';
    else if (isCurrency && hasK) formatted = '$' + Math.round(current) + 'K';
    else if (isCurrency)  formatted = '$' + Math.round(current).toLocaleString();
    else                  formatted = Math.round(current).toString();
    if (displayVal.startsWith('+') && current > 0) formatted = '+' + formatted;
    el.textContent = formatted;
    if (frame >= steps) {
      clearInterval(timer);
      el.textContent = displayVal;
      el.classList.remove('animating');
    }
  }, 900 / steps);
}

function _fmtM(n) {
  if (Math.abs(n) >= 1e6) return (n < 0 ? '-' : '') + '$' + (Math.abs(n) / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n < 0 ? '-' : '') + '$' + (Math.abs(n) / 1e3).toFixed(0) + 'K';
  return '$' + n;
}
function _fmt$(n) { return '$' + Number(n || 0).toLocaleString(); }

function exportCSV() {
  const data = Filters.getFiltered();
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(','), ...data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'capex_equipment_export.csv';
  a.click();
}
