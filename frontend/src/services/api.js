const RAW_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";
const API_BASE = RAW_BASE.trim().replace(/\/+$/, "");

function headers(){ return {"Content-Type":"application/json"}; }
function toUrl(p){ return `${API_BASE}${p.startsWith('/')?p:`/${p}`}`; }

async function handleResponse(r){
  const t = await r.text();
  let data;
  try { data = t ? JSON.parse(t) : {}; }
  catch { data = t; }
  if(!r.ok){
    const error = new Error(`Request failed with status ${r.status}`);
    error.status = r.status;
    error.body = data;
    throw error;
  }
  return data;
}

async function getJSON(p){
  const r = await fetch(toUrl(p), { headers: headers() });
  return handleResponse(r);
}

async function postJSON(p, b){
  const r = await fetch(toUrl(p), { method: 'POST', headers: headers(), body: JSON.stringify(b || {}) });
  return handleResponse(r);
}

// high level API helpers
export async function fetchConfig(){
  return getJSON('/api/config');
}

export async function saveConfig(cfg){
  return postJSON('/api/config', cfg);
}

export async function startRun(cfg, dry, chats){
  await saveConfig({ ...cfg, dry_run: dry, chats });
  return postJSON('/api/start', { chats });
}

export async function stopRun(){
  return postJSON('/api/stop', {});
}

export async function fetchStatus(){
  return getJSON('/api/status');
}

export async function fetchDialogs(){
  return getJSON('/api/dialogs');
}

export async function fetchContacts(){
  try {
    const data = await getJSON('/api/contacts');
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error };
  }
}

export { API_BASE };
