/**
 * filters.js
 * Global filter state and filtering logic.
 */

const Filters = (() => {
  let _data = [];
  let _filtered = [];
  let _listeners = [];

  const state = {
    fiscal_year: 'FY2025',
    period: 'Year to Date',
    site: '',
    region: '',
    tool_type: '',
    program: '',
    status: '',
    oem_vendor: '',
    phase: '',
    priority: '',
    risk: '',
  };

  function init(data) {
    _data = data;
    _filtered = [..._data];
    _populateDropdowns();
    _bindUI();
  }

  function _populateDropdowns() {
    const sites = [...new Set(_data.map(r => r.site))].sort();
    const regions = [...new Set(_data.map(r => r.region))].sort();
    const types = [...new Set(_data.map(r => r.tool_type))].sort();
    const programs = [...new Set(_data.map(r => r.program))].sort();
    const vendors = [...new Set(_data.map(r => r.oem_vendor))].sort();
    const statuses = [...new Set(_data.map(r => r.install_status))].sort();

    _fillSelect('filter-site', sites, 'All Sites');
    _fillSelect('filter-region', regions, 'All Regions');
    _fillSelect('filter-type', types, 'All Categories');
    _fillSelect('filter-program', programs, 'All Programs');
    _fillSelect('filter-vendor', vendors, 'All Vendors');
    _fillSelect('filter-status', statuses, 'All Statuses');
  }

  function _fillSelect(id, options, placeholder) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="">${placeholder}</option>` +
      options.map(o => `<option value="${o}">${o}</option>`).join('');
  }

  function _bindUI() {
    const map = {
      'filter-site': 'site',
      'filter-region': 'region',
      'filter-type': 'tool_type',
      'filter-program': 'program',
      'filter-vendor': 'oem_vendor',
      'filter-status': 'status',
      'filter-phase': 'phase',
      'filter-priority': 'priority',
      'filter-risk': 'risk',
      'filter-fy': 'fiscal_year',
      'filter-period': 'period',
    };
    Object.entries(map).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => { state[key] = el.value; });
    });

    const applyBtn = document.getElementById('btn-apply-filters');
    if (applyBtn) applyBtn.addEventListener('click', apply);

    const resetBtn = document.getElementById('btn-reset-filters');
    if (resetBtn) resetBtn.addEventListener('click', reset);
  }

  function apply() {
    _filtered = _data.filter(r => {
      if (state.site && r.site !== state.site) return false;
      if (state.region && r.region !== state.region) return false;
      if (state.tool_type && r.tool_type !== state.tool_type) return false;
      if (state.program && r.program !== state.program) return false;
      if (state.oem_vendor && r.oem_vendor !== state.oem_vendor) return false;
      if (state.status && r.install_status !== state.status) return false;
      if (state.phase && r.phase !== state.phase) return false;
      if (state.priority && r.priority !== state.priority) return false;
      if (state.risk && r.risk !== state.risk) return false;
      return true;
    });
    _notify();
  }

  function reset() {
    Object.keys(state).forEach(k => {
      if (!['fiscal_year', 'period'].includes(k)) state[k] = '';
    });
    document.querySelectorAll('.filter-bar select').forEach(el => {
      if (!el.id.includes('fy') && !el.id.includes('period')) el.value = '';
    });
    _filtered = [..._data];
    _notify();
  }

  function getFiltered() { return _filtered; }

  function onChange(fn) { _listeners.push(fn); }

  function _notify() { _listeners.forEach(fn => fn(_filtered)); }

  return { init, apply, reset, getFiltered, onChange, state };
})();
