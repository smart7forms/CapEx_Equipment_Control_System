/**
 * charts.js — EXECUTIVE EDITION
 * Upgrades: area gradients, executive tooltips, thin-ring doughnuts
 * with center labels, index-mode hover, point-style legends,
 * chart entrance animations, and hover micro-interactions.
 */

const Charts = (() => {
  const _instances = {};

  const COLORS = {
    blue:      '#2563eb',
    green:     '#16a34a',
    amber:     '#d97706',
    red:       '#dc2626',
    dark:      '#1a1a1a',
    gray:      '#737373',
    lightGray: '#e5e5e5',
    purple:    '#7c3aed',
    teal:      '#0891b2',
  };

  // ── Executive tooltip ────────────────────────────────────────────────
  const EXEC_TOOLTIP = {
    backgroundColor: 'rgba(255,255,255,0.97)',
    titleColor: '#1a1a1a',
    bodyColor: '#525252',
    borderColor: '#e5e5e5',
    borderWidth: 1,
    padding: 14,
    boxPadding: 6,
    cornerRadius: 4,
    titleFont: { family: 'Inter', size: 12, weight: '700' },
    bodyFont:  { family: 'Inter', size: 11, weight: '500' },
    usePointStyle: true,
    boxWidth: 8,
    boxHeight: 8,
    callbacks: {
      label: (ctx) => {
        const val = ctx.raw;
        if (typeof val === 'number') {
          if (Math.abs(val) >= 1e6) return `  ${ctx.dataset.label}: $${(val / 1e6).toFixed(2)}M`;
          if (Math.abs(val) >= 1e3) return `  ${ctx.dataset.label}: $${(val / 1e3).toFixed(0)}K`;
        }
        return `  ${ctx.dataset.label}: ${val}`;
      },
    },
  };

  // ── Base options ─────────────────────────────────────────────────────
  const BASE_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 700, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 6,
          boxHeight: 6,
          padding: 18,
          font: { family: 'Inter', size: 11, weight: '600' },
          color: '#525252',
        },
      },
      tooltip: EXEC_TOOLTIP,
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { family: 'Inter', size: 10 }, color: '#737373', padding: 6 },
      },
      y: {
        grid: { color: '#f5f5f5' },
        border: { display: false, dash: [4, 4] },
        ticks: { font: { family: 'Inter', size: 10 }, color: '#737373', padding: 8 },
      },
    },
  };

  // ── Gradient factory ─────────────────────────────────────────────────
  function _gradient(canvasEl, hexColor, alphaTop = 0.18, alphaBot = 0.01) {
    const h = canvasEl.parentElement?.offsetHeight || 260;
    const ctx = canvasEl.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    const top = Math.round(alphaTop * 255).toString(16).padStart(2, '0');
    const bot = Math.round(alphaBot * 255).toString(16).padStart(2, '0');
    grad.addColorStop(0, hexColor + top);
    grad.addColorStop(1, hexColor + bot);
    return grad;
  }

  function _destroy(id) {
    if (_instances[id]) { _instances[id].destroy(); delete _instances[id]; }
  }

  function _fmt(n) {
    if (typeof n !== 'number') return String(n);
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return String(n);
  }

  // ── Center-label plugin for doughnut charts ──────────────────────────
  const centerLabelPlugin = {
    id: 'centerLabel',
    afterDraw(chart) {
      if (!chart.config._centerLabel) return;
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = chartArea.left + chartArea.width / 2;
      const cy = chartArea.top + chartArea.height / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "700 19px 'Playfair Display', Georgia, serif";
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText(chart.config._centerLabel.value, cx, cy - 9);
      ctx.font = "600 9px 'Inter', sans-serif";
      ctx.fillStyle = '#737373';
      ctx.fillText(chart.config._centerLabel.label.toUpperCase(), cx, cy + 11);
      ctx.restore();
    },
  };

  if (typeof Chart !== 'undefined') {
    // Only register once
    if (!Chart.registry.plugins.get('centerLabel')) {
      Chart.register(centerLabelPlugin);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // INDIVIDUAL CHART RENDERERS
  // ─────────────────────────────────────────────────────────────────────

  function renderTrajectory(data) {
    const id = 'trajectoryChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const seed   = data.length;
    const deployed = months.map((_, i) => Math.round(10 + i * 14 + (seed % 5)));
    const plan     = months.map((_, i) => Math.round(12 + i * 13.5));
    const gradDark = _gradient(el, '#1a1a1a', 0.14, 0.01);

    _instances[id] = new Chart(el, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Actual Deployed',
            data: deployed,
            borderColor: COLORS.dark,
            borderWidth: 2.5,
            backgroundColor: gradDark,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#fff',
            pointBorderColor: COLORS.dark,
            pointBorderWidth: 2,
            fill: true,
          },
          {
            label: 'Plan',
            data: plan,
            borderColor: COLORS.blue,
            borderWidth: 1.5,
            borderDash: [6, 4],
            backgroundColor: 'transparent',
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            fill: false,
          },
        ],
      },
      options: {
        ...BASE_OPTS,
        plugins: {
          ...BASE_OPTS.plugins,
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.dataset.label}: ${ctx.raw} tools` } },
        },
        scales: {
          ...BASE_OPTS.scales,
          y: { ...BASE_OPTS.scales.y, ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => v + ' tools' } },
        },
      },
    });
  }

  function renderBySite(data) {
    const id = 'bySiteChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const siteMap = {};
    data.forEach(r => { siteMap[r.site] = (siteMap[r.site] || 0) + 1; });
    const sorted = Object.entries(siteMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const labels = sorted.map(([s]) => s.length > 18 ? s.slice(0, 16) + '...' : s);
    const values = sorted.map(([, v]) => v);
    const mx     = Math.max(...values);

    _instances[id] = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Tools',
          data: values,
          backgroundColor: values.map(v => {
            const i = Math.round(26 + (1 - v / mx) * 180);
            return `rgb(${i},${i},${i})`;
          }),
          hoverBackgroundColor: COLORS.blue,
          borderRadius: 3,
          borderSkipped: false,
        }],
      },
      options: {
        ...BASE_OPTS,
        indexAxis: 'y',
        plugins: {
          ...BASE_OPTS.plugins,
          legend: { display: false },
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  Tools: ${ctx.raw}` } },
        },
        scales: {
          x: { ...BASE_OPTS.scales.x, grid: { color: '#f5f5f5', display: true } },
          y: { ...BASE_OPTS.scales.y, grid: { display: false } },
        },
      },
    });
  }

  function renderByType(data) {
    const id = 'byTypeChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const typeMap = {};
    data.forEach(r => { typeMap[r.tool_type] = (typeMap[r.tool_type] || 0) + r.budget; });
    const sorted  = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const palette = [COLORS.dark, COLORS.blue, COLORS.green, COLORS.amber, COLORS.red, COLORS.purple, COLORS.teal];
    const total   = sorted.reduce((s, [, v]) => s + v, 0);

    _instances[id] = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: sorted.map(([k]) => k),
        datasets: [{
          data: sorted.map(([, v]) => v),
          backgroundColor: palette,
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverOffset: 12,
          cutout: '76%',
          borderRadius: 4,
          spacing: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: true },
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            position: 'right',
            labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 12, font: { family: 'Inter', size: 10, weight: '600' }, color: '#525252' },
          },
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.label}: ${_fmt(ctx.raw)} (${Math.round(ctx.raw / total * 100)}%)` } },
        },
      },
      _centerLabel: { label: 'Total Budget', value: _fmt(total) },
    });
  }

  function renderRiskDist(data) {
    const id = 'riskDistChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const counts = { Low: 0, Medium: 0, High: 0 };
    data.forEach(r => { if (counts[r.risk] !== undefined) counts[r.risk]++; });
    const total = counts.Low + counts.Medium + counts.High;

    _instances[id] = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: ['Low Risk', 'Medium Risk', 'High Risk'],
        datasets: [{
          data: [counts.Low, counts.Medium, counts.High],
          backgroundColor: [COLORS.green, COLORS.amber, COLORS.red],
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverOffset: 12,
          cutout: '76%',
          borderRadius: 4,
          spacing: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: true },
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 16, font: { family: 'Inter', size: 11, weight: '600' }, color: '#525252' },
          },
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.label}: ${ctx.raw} tools (${Math.round(ctx.raw / total * 100)}%)` } },
        },
      },
      _centerLabel: { label: 'Total Tools', value: String(total) },
    });
  }

  function renderBudgetActual(data) {
    const id = 'budgetActualChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let cumBudget = 0, cumActual = 0;
    const budgetArr = [], actualArr = [], forecastArr = [];
    const totalBudget = data.reduce((s, r) => s + r.budget, 0);
    const totalActual = data.reduce((s, r) => s + r.actual, 0);
    const seed = data.length % 7;

    months.forEach((_, i) => {
      cumBudget += totalBudget / 12;
      cumActual += totalActual / 12 * (1 + (((i + seed) % 10) - 5) * 0.006);
      budgetArr.push(+(cumBudget / 1e6).toFixed(1));
      actualArr.push(+(cumActual / 1e6).toFixed(1));
      forecastArr.push(i >= 9 ? +((cumActual + (totalBudget - cumBudget) * 0.97) / 1e6).toFixed(1) : null);
    });

    const gradActual = _gradient(el, '#1a1a1a', 0.12, 0.01);

    _instances[id] = new Chart(el, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          { label: 'Budget',   data: budgetArr,   borderColor: '#d4d4d4', borderWidth: 1.5, borderDash: [6, 4], tension: 0.3, pointRadius: 0, fill: false },
          { label: 'Actual',   data: actualArr,   borderColor: COLORS.dark,  borderWidth: 2.5, backgroundColor: gradActual, tension: 0.4, pointRadius: 3, pointHoverRadius: 7, pointBackgroundColor: '#fff', pointBorderColor: COLORS.dark, pointBorderWidth: 2, fill: true },
          { label: 'Forecast', data: forecastArr, borderColor: COLORS.blue, borderWidth: 2,   borderDash: [4, 3], tension: 0.3, pointRadius: 0, fill: false },
        ],
      },
      options: {
        ...BASE_OPTS,
        plugins: {
          ...BASE_OPTS.plugins,
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => ctx.raw != null ? `  ${ctx.dataset.label}: $${ctx.raw}M` : null } },
        },
        scales: {
          ...BASE_OPTS.scales,
          y: { ...BASE_OPTS.scales.y, ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => '$' + v + 'M' } },
        },
      },
    });
  }

  function renderForecastAccuracy() {
    const id = 'forecastAccuracyChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const accuracy = [84.2, 86.1, 87.3, 88.9, 89.2, 90.0, 90.8, 91.1, 91.3, 91.6, 92.1, 91.9];
    const gradGreen = _gradient(el, '#16a34a', 0.15, 0.01);

    _instances[id] = new Chart(el, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Forecast Accuracy',
          data: accuracy,
          borderColor: COLORS.green,
          borderWidth: 2.5,
          backgroundColor: gradGreen,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 7,
          pointBackgroundColor: '#fff',
          pointBorderColor: COLORS.green,
          pointBorderWidth: 2,
          fill: true,
        }],
      },
      options: {
        ...BASE_OPTS,
        plugins: {
          ...BASE_OPTS.plugins,
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  Accuracy: ${ctx.raw}%` } },
        },
        scales: {
          ...BASE_OPTS.scales,
          y: { ...BASE_OPTS.scales.y, min: 80, max: 100, ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => v + '%' } },
        },
      },
    });
  }

  function renderPhaseReadiness(data) {
    const id = 'phaseReadinessChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const phases = ['EVT', 'DVT', 'PVT'];
    const complete = [], inProgress = [], pending = [];

    phases.forEach(ph => {
      const group = data.filter(r => r.phase === ph);
      const total = group.length || 1;
      const c  = group.filter(r => ['Operational','AIS Capitalized','Qualified'].includes(r.install_status)).length;
      const ip = group.filter(r => ['Installed','OEM Build','PO Issued'].includes(r.install_status)).length;
      complete.push(Math.round((c / total) * 100));
      inProgress.push(Math.round((ip / total) * 100));
      pending.push(Math.round(((total - c - ip) / total) * 100));
    });

    _instances[id] = new Chart(el, {
      type: 'bar',
      data: {
        labels: phases,
        datasets: [
          { label: 'Complete',    data: complete,    backgroundColor: COLORS.green,     borderRadius: 3, borderSkipped: false },
          { label: 'In Progress', data: inProgress,  backgroundColor: COLORS.amber,     borderRadius: 0, borderSkipped: false },
          { label: 'Pending',     data: pending,     backgroundColor: COLORS.lightGray, borderRadius: 0, borderSkipped: false },
        ],
      },
      options: {
        ...BASE_OPTS,
        plugins: {
          ...BASE_OPTS.plugins,
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.dataset.label}: ${ctx.raw}%` } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#525252' } },
          y: { stacked: true, max: 100, grid: { color: '#f5f5f5' }, border: { display: false }, ticks: { font: { family: 'Inter', size: 10 }, callback: v => v + '%' } },
        },
      },
    });
  }

  function renderSiteRisk(data) {
    const id = 'siteRiskChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const siteMap = {};
    data.forEach(r => {
      if (!siteMap[r.site]) siteMap[r.site] = { Low: 0, Medium: 0, High: 0 };
      if (siteMap[r.site][r.risk] !== undefined) siteMap[r.site][r.risk]++;
    });
    const top = Object.entries(siteMap)
      .sort((a, b) => (b[1].High + b[1].Medium) - (a[1].High + a[1].Medium))
      .slice(0, 8);
    const labels = top.map(([s]) => s.length > 16 ? s.slice(0, 14) + '...' : s);

    _instances[id] = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'High',   data: top.map(([, v]) => v.High),   backgroundColor: COLORS.red   + 'cc', borderRadius: 0, borderSkipped: false },
          { label: 'Medium', data: top.map(([, v]) => v.Medium), backgroundColor: COLORS.amber + 'cc', borderRadius: 0, borderSkipped: false },
          { label: 'Low',    data: top.map(([, v]) => v.Low),    backgroundColor: COLORS.green + 'cc', borderRadius: 3, borderSkipped: false },
        ],
      },
      options: {
        ...BASE_OPTS,
        indexAxis: 'y',
        plugins: {
          ...BASE_OPTS.plugins,
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.dataset.label} Risk: ${ctx.raw} tools` } },
        },
        scales: {
          x: { stacked: true, grid: { color: '#f5f5f5' }, border: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } },
          y: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } },
        },
      },
    });
  }

  function renderDemandCurve(data) {
    const id = 'demandCurveChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    _instances[id] = new Chart(el, {
      type: 'line',
      data: {
        labels: ['Q1 FY26', 'Q2 FY26', 'Q3 FY26', 'Q4 FY26'],
        datasets: [
          { label: 'Capacity',     data: [193, 193, 205, 211], borderColor: COLORS.dark,  borderWidth: 2.5, tension: 0.2, pointRadius: 5, pointHoverRadius: 8, pointBackgroundColor: '#fff', pointBorderColor: COLORS.dark,  pointBorderWidth: 2, fill: false },
          { label: 'Baseline',     data: [193, 196, 200, 205], borderColor: COLORS.green, borderWidth: 2,   borderDash: [5, 4], tension: 0.2, pointRadius: 4, pointHoverRadius: 7, fill: false },
          { label: 'Conservative', data: [193, 200, 208, 218], borderColor: COLORS.amber, borderWidth: 2,   borderDash: [5, 4], tension: 0.2, pointRadius: 4, pointHoverRadius: 7, fill: false },
          { label: 'Aggressive',   data: [193, 205, 220, 238], borderColor: COLORS.red,   borderWidth: 2,   borderDash: [5, 4], tension: 0.2, pointRadius: 4, pointHoverRadius: 7, fill: false },
        ],
      },
      options: {
        ...BASE_OPTS,
        plugins: {
          ...BASE_OPTS.plugins,
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.dataset.label}: ${ctx.raw} tools` } },
        },
        scales: {
          ...BASE_OPTS.scales,
          y: { ...BASE_OPTS.scales.y, ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => v + ' tools' } },
        },
      },
    });
  }

  function renderSensitivity() {
    const id = 'sensitivityChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const vals   = [-8.6, 0, 4.8, 9.6, 17.2];
    const labels = ['Downside -8%', 'Baseline +0%', 'Conservative +6%', 'Base +12%', 'Aggressive +20%'];

    _instances[id] = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'CapEx Impact $M',
          data: vals,
          backgroundColor: vals.map(v => v < 0 ? COLORS.green + 'bb' : v === 0 ? COLORS.dark + '99' : v < 10 ? COLORS.amber + 'bb' : COLORS.red + 'bb'),
          hoverBackgroundColor: vals.map(v => v < 0 ? COLORS.green : v === 0 ? COLORS.dark : v < 10 ? COLORS.amber : COLORS.red),
          borderRadius: 3,
          borderSkipped: false,
        }],
      },
      options: {
        ...BASE_OPTS,
        plugins: {
          ...BASE_OPTS.plugins,
          legend: { display: false },
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  Impact: ${ctx.raw > 0 ? '+' : ''}$${ctx.raw}M` } },
        },
        scales: {
          ...BASE_OPTS.scales,
          y: { ...BASE_OPTS.scales.y, ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => (v > 0 ? '+' : '') + '$' + v + 'M' } },
        },
      },
    });
  }

  function renderCapitalAvoidance(data) {
    const id = 'capitalAvoidanceChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const months    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const avoidance = [0.8, 1.4, 2.1, 3.2, 4.6, 6.1, 8.2, 10.4, 12.8, 14.9, 17.1, 18.7];
    const gradGreen = _gradient(el, '#16a34a', 0.18, 0.01);

    _instances[id] = new Chart(el, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Capital Avoidance',
          data: avoidance,
          borderColor: COLORS.green,
          borderWidth: 2.5,
          backgroundColor: gradGreen,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 7,
          pointBackgroundColor: '#fff',
          pointBorderColor: COLORS.green,
          pointBorderWidth: 2,
          fill: true,
        }],
      },
      options: {
        ...BASE_OPTS,
        plugins: {
          ...BASE_OPTS.plugins,
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  Cumulative: $${ctx.raw}M avoided` } },
        },
        scales: {
          ...BASE_OPTS.scales,
          y: { ...BASE_OPTS.scales.y, ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => '$' + v + 'M' } },
        },
      },
    });
  }

  function renderOemPerf(data) {
    const id = 'oemPerfChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const oemMap = {};
    data.forEach(r => {
      if (!oemMap[r.oem_vendor]) oemMap[r.oem_vendor] = { total: 0, ontime: 0 };
      oemMap[r.oem_vendor].total++;
      if (r.install_status !== 'Delayed') oemMap[r.oem_vendor].ontime++;
    });
    const sorted = Object.entries(oemMap).sort((a, b) => b[1].total - a[1].total);
    const labels = sorted.map(([k]) => k.length > 16 ? k.slice(0, 14) + '...' : k);
    const pct    = sorted.map(([, v]) => Math.round((v.ontime / v.total) * 100));

    _instances[id] = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'On-Time Delivery %',
          data: pct,
          backgroundColor: pct.map(v => (v >= 90 ? COLORS.green : v >= 80 ? COLORS.amber : COLORS.red) + 'bb'),
          hoverBackgroundColor: pct.map(v => v >= 90 ? COLORS.green : v >= 80 ? COLORS.amber : COLORS.red),
          borderRadius: 3,
          borderSkipped: false,
        }],
      },
      options: {
        ...BASE_OPTS,
        plugins: {
          ...BASE_OPTS.plugins,
          legend: { display: false },
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  On-Time: ${ctx.raw}%` } },
        },
        scales: {
          ...BASE_OPTS.scales,
          y: { ...BASE_OPTS.scales.y, max: 100, ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => v + '%' } },
        },
      },
    });
  }

  function renderAisStatus(data) {
    const id = 'aisStatusChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;

    const order   = ['Capitalized', 'In Progress', 'Pending', 'Not Started'];
    const palette = [COLORS.green, COLORS.blue, COLORS.amber, COLORS.lightGray];
    const counts  = {};
    data.forEach(r => { counts[r.ais_status] = (counts[r.ais_status] || 0) + 1; });
    const entries = order.filter(k => counts[k]).map(k => [k, counts[k]]);
    const total   = entries.reduce((s, [, v]) => s + v, 0);

    _instances[id] = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: entries.map(([k]) => k),
        datasets: [{
          data: entries.map(([, v]) => v),
          backgroundColor: entries.map(([k]) => palette[order.indexOf(k)]),
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverOffset: 12,
          cutout: '76%',
          borderRadius: 4,
          spacing: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: true },
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 14, font: { family: 'Inter', size: 11, weight: '600' }, color: '#525252' },
          },
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.label}: ${ctx.raw} (${Math.round(ctx.raw / total * 100)}%)` } },
        },
      },
      _centerLabel: { label: 'AIS Status', value: String(total) },
    });
  }

  // ── Registry: Status distribution (doughnut) ──────────────────────
  function renderRegStatus(data) {
    const id = 'regStatusChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;
    const statusMap = {};
    data.forEach(r => { statusMap[r.install_status] = (statusMap[r.install_status] || 0) + 1; });
    const order = ['Operational','AIS Capitalized','Qualified','Installed','OEM Build','PO Issued','Demand Identified','Delayed'];
    const palette = [COLORS.green, COLORS.teal, COLORS.blue, COLORS.dark+'cc', COLORS.amber, COLORS.gray, COLORS.lightGray, COLORS.red];
    const entries = order.filter(k => statusMap[k]).map((k,i) => ({ label: k, value: statusMap[k], color: palette[i] }));
    const total = entries.reduce((s, e) => s + e.value, 0);
    _instances[id] = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: entries.map(e => e.label),
        datasets: [{ data: entries.map(e => e.value), backgroundColor: entries.map(e => e.color), borderWidth: 2, borderColor: '#fff', cutout: '72%', borderRadius: 3, spacing: 2, hoverOffset: 10 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: true },
        animation: { duration: 700, easing: 'easeOutQuart' },
        plugins: {
          legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 10, font: { family: 'Inter', size: 10, weight: '600' }, color: '#525252' } },
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.label}: ${ctx.raw} (${Math.round(ctx.raw/total*100)}%)` } },
        },
      },
      _centerLabel: { label: 'Total', value: String(total) },
    });
  }

  // ── Registry: Priority bar ─────────────────────────────────────────
  function renderRegPriority(data) {
    const id = 'regPriorityChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;
    const pMap = { P1: 0, P2: 0, P3: 0, P4: 0 };
    data.forEach(r => { if (pMap[r.priority] !== undefined) pMap[r.priority]++; });
    _instances[id] = new Chart(el, {
      type: 'bar',
      data: {
        labels: ['P1', 'P2', 'P3', 'P4'],
        datasets: [{
          label: 'Tools',
          data: [pMap.P1, pMap.P2, pMap.P3, pMap.P4],
          backgroundColor: [COLORS.red + 'cc', COLORS.amber + 'cc', COLORS.blue + 'cc', COLORS.gray + 'cc'],
          hoverBackgroundColor: [COLORS.red, COLORS.amber, COLORS.blue, COLORS.gray],
          borderRadius: 3, borderSkipped: false,
        }],
      },
      options: {
        ...BASE_OPTS,
        plugins: { ...BASE_OPTS.plugins, legend: { display: false }, tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.label}: ${ctx.raw} tools` } } },
        scales: { x: { ...BASE_OPTS.scales.x }, y: { ...BASE_OPTS.scales.y } },
      },
    });
  }

  // ── Registry: Utilisation bands (horizontal bar) ───────────────────
  function renderRegUtil(data) {
    const id = 'regUtilChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;
    const bands = { '<50%': 0, '50-65%': 0, '65-80%': 0, '>80%': 0 };
    data.forEach(r => {
      if (r.utilization < 50)       bands['<50%']++;
      else if (r.utilization < 65)  bands['50-65%']++;
      else if (r.utilization < 80)  bands['65-80%']++;
      else                          bands['>80%']++;
    });
    _instances[id] = new Chart(el, {
      type: 'bar',
      data: {
        labels: Object.keys(bands),
        datasets: [{
          label: 'Tools',
          data: Object.values(bands),
          backgroundColor: [COLORS.red+'cc', COLORS.amber+'cc', COLORS.green+'99', COLORS.green+'cc'],
          hoverBackgroundColor: [COLORS.red, COLORS.amber, COLORS.green, COLORS.green],
          borderRadius: 3, borderSkipped: false,
        }],
      },
      options: {
        ...BASE_OPTS,
        indexAxis: 'y',
        plugins: { ...BASE_OPTS.plugins, legend: { display: false }, tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.label}: ${ctx.raw} tools` } } },
        scales: {
          x: { ...BASE_OPTS.scales.x, grid: { color: '#f5f5f5', display: true } },
          y: { ...BASE_OPTS.scales.y, grid: { display: false } },
        },
      },
    });
  }

  // ── Early Engagement: Decision type breakdown (doughnut) ───────────
  function renderEarlyDecision(data) {
    const id = 'earlyDecisionChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;
    const reuse = data.filter(r => r.actual < r.budget && r.actual < r.budget * 0.5).length;
    const consol = data.filter(r => r.actual < r.budget && r.actual >= r.budget * 0.5).length;
    const newBuy = data.filter(r => r.actual >= r.budget).length;
    const total = reuse + consol + newBuy;
    _instances[id] = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: ['Reuse', 'Consolidate', 'New Buy'],
        datasets: [{ data: [reuse, consol, newBuy], backgroundColor: [COLORS.green, COLORS.blue, COLORS.dark+'99'], borderWidth: 2, borderColor: '#fff', cutout: '72%', borderRadius: 3, spacing: 2, hoverOffset: 10 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: true },
        animation: { duration: 700, easing: 'easeOutQuart' },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 12, font: { family: 'Inter', size: 11, weight: '600' }, color: '#525252' } },
          tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.label}: ${ctx.raw} (${Math.round(ctx.raw/total*100)}%)` } },
        },
      },
      _centerLabel: { label: 'Decisions', value: String(total) },
    });
  }

  // ── OEM: Volume per vendor (horizontal bar) ────────────────────────
  function renderOemVolume(data) {
    const id = 'oemVolumeChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;
    const oemMap = {};
    data.forEach(r => { oemMap[r.oem_vendor] = (oemMap[r.oem_vendor] || 0) + 1; });
    const sorted = Object.entries(oemMap).sort((a,b) => b[1] - a[1]);
    const labels = sorted.map(([k]) => k.length > 16 ? k.slice(0,14)+'...' : k);
    const vals   = sorted.map(([,v]) => v);
    const mx     = Math.max(...vals);
    _instances[id] = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Tools', data: vals,
          backgroundColor: vals.map(v => { const i = Math.round(26+(1-v/mx)*180); return `rgb(${i},${i},${i})`; }),
          hoverBackgroundColor: COLORS.blue, borderRadius: 3, borderSkipped: false }],
      },
      options: {
        ...BASE_OPTS, indexAxis: 'y',
        plugins: { ...BASE_OPTS.plugins, legend: { display: false }, tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  Tools: ${ctx.raw}` } } },
        scales: {
          x: { ...BASE_OPTS.scales.x, grid: { color: '#f5f5f5', display: true } },
          y: { ...BASE_OPTS.scales.y, grid: { display: false } },
        },
      },
    });
  }

  // ── Capitalization: Asset value by class (bar) ─────────────────────
  function renderAssetClass(data) {
    const id = 'assetClassChart';
    _destroy(id);
    const el = document.getElementById(id);
    if (!el) return;
    const classMap = {};
    data.filter(r => r.ais_status === 'Capitalized').forEach(r => {
      classMap[r.asset_class] = (classMap[r.asset_class] || 0) + r.actual;
    });
    const sorted  = Object.entries(classMap).sort((a,b) => b[1]-a[1]);
    const palette = [COLORS.dark, COLORS.blue, COLORS.green, COLORS.amber, COLORS.purple, COLORS.teal, COLORS.red];
    _instances[id] = new Chart(el, {
      type: 'bar',
      data: {
        labels: sorted.map(([k]) => k || 'Unknown'),
        datasets: [{ label: 'Asset Value', data: sorted.map(([,v]) => v),
          backgroundColor: sorted.map((_,i) => palette[i % palette.length] + 'cc'),
          hoverBackgroundColor: sorted.map((_,i) => palette[i % palette.length]),
          borderRadius: 3, borderSkipped: false }],
      },
      options: {
        ...BASE_OPTS,
        plugins: { ...BASE_OPTS.plugins, legend: { display: false }, tooltip: { ...EXEC_TOOLTIP, callbacks: { label: ctx => `  ${ctx.label}: ${_fmt(ctx.raw)}` } } },
        scales: {
          ...BASE_OPTS.scales,
          y: { ...BASE_OPTS.scales.y, ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => _fmt(v) } },
        },
      },
    });
  }

  function updateAll(data) {
    renderTrajectory(data);
    renderBySite(data);
    renderByType(data);
    renderRiskDist(data);
    renderBudgetActual(data);
    renderForecastAccuracy();
    renderPhaseReadiness(data);
    renderSiteRisk(data);
    renderDemandCurve(data);
    renderSensitivity();
    renderCapitalAvoidance(data);
    renderOemPerf(data);
    renderAisStatus(data);
    // New charts
    renderRegStatus(data);
    renderRegPriority(data);
    renderRegUtil(data);
    renderEarlyDecision(data);
    renderOemVolume(data);
    renderAssetClass(data);
  }

  return { updateAll, renderTrajectory, renderBySite, renderByType, renderRiskDist };
})();
