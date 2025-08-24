const RAW_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";
const API_BASE = RAW_BASE.trim().replace(/\/+$/, "");

function headers(){ return {"Content-Type":"application/json"}; }
function toUrl(p){ return `${API_BASE}${p.startsWith('/')?p:`/${p}`}`; }

async function getJSON(p){
  const r = await fetch(toUrl(p), { headers: headers() });
  const t = await r.text();
  try { return { ok: r.ok, data: t ? JSON.parse(t) : {} }; }
  catch { return { ok: r.ok, data: {} }; }
}

async function postJSON(p, b){
  const r = await fetch(toUrl(p), { method: 'POST', headers: headers(), body: JSON.stringify(b || {}) });
  const t = await r.text();
  try { return { ok: r.ok, data: t ? JSON.parse(t) : {} }; }
  catch { return { ok: r.ok, data: {} }; }
}

// high level API helpers
export async function fetchConfig(){
  return getJSON('/api/config');
}

export async function saveConfig(cfg){
  return postJSON('/api/config', cfg);
}

export async function startRun(cfg, dry){
  await saveConfig({ ...cfg, dry_run: dry });
  return postJSON('/api/start', {});
}

export async function stopRun(){
  return postJSON('/api/stop', {});
}

export async function fetchStatus(){
  return getJSON('/api/status');
}

export { API_BASE };
