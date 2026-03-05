/**
 * dataLoader.js
 * Loads equipment data from Excel (SheetJS) with JSON fallback.
 */

const DataLoader = (() => {
  let _rawData = [];

  async function load() {
    try {
      const resp = await fetch('./data/equipment_data.xlsx');
      if (!resp.ok) throw new Error('Excel not found');
      const buf = await resp.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      _rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });
      console.log(`[DataLoader] Loaded ${_rawData.length} records from Excel.`);
    } catch (e) {
      console.warn('[DataLoader] Excel failed, trying JSON fallback.', e);
      try {
        const resp = await fetch('./data/equipment_data.json');
        _rawData = await resp.json();
        console.log(`[DataLoader] Loaded ${_rawData.length} records from JSON.`);
      } catch (e2) {
        console.error('[DataLoader] Both sources failed.', e2);
        _rawData = [];
      }
    }
    // Normalize types
    _rawData = _rawData.map(r => ({
      ...r,
      budget: Number(r.budget) || 0,
      actual: Number(r.actual) || 0,
      variance: Number(r.variance) || 0,
      utilization: Number(r.utilization) || 0,
      lead_time_weeks: Number(r.lead_time_weeks) || 0,
      deploy_pct: Number(r.deploy_pct) || 0,
      useful_life_yr: Number(r.useful_life_yr) || 5,
    }));
    return _rawData;
  }

  function getAll() { return _rawData; }

  return { load, getAll };
})();
