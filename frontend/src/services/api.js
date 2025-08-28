const RAW_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";
const API_BASE = RAW_BASE.trim().replace(/\/+$/, "");

function headers(){ return {"Content-Type":"application/json"}; }
function toUrl(p){ return `${API_BASE}${p.startsWith('/')?p:`/${p}`}`; }

async function getJSON(p){
  try{
    const r = await fetch(toUrl(p), { headers: headers() });
    const t = await r.text();
    try { return { ok: r.ok, data: t ? JSON.parse(t) : {} }; }
    catch { return { ok: r.ok, data: {} }; }
  }catch(error){
    return { ok: false, data: {}, error };
  }
}

async function postJSON(p, b){
  try{
    const r = await fetch(toUrl(p), { method: 'POST', headers: headers(), body: JSON.stringify(b || {}) });
    const t = await r.text();
    try { return { ok: r.ok, data: t ? JSON.parse(t) : {} }; }
    catch { return { ok: r.ok, data: {} }; }
  }catch(error){
    return { ok: false, data: {}, error };
  }
}

function ensureOk(r, msg){
  if(!r.ok){
    throw r.error || new Error(msg || 'Request failed');
  }
  return r.data;
}

// high level API helpers
export async function fetchConfig(){
  return ensureOk(await getJSON('/api/config'), 'Failed to fetch config');
}

export async function saveConfig(cfg){
  return ensureOk(await postJSON('/api/config', cfg), 'Failed to save config');
}

export async function startRun(cfg, dry, chats){
  await saveConfig({ ...cfg, dry_run: dry, chats });
  return ensureOk(await postJSON('/api/start', { chats }), 'Failed to start run');
}

export async function stopRun(){
  return ensureOk(await postJSON('/api/stop', {}), 'Failed to stop run');
}

export async function fetchStatus(){
  return ensureOk(await getJSON('/api/status'), 'Failed to fetch status');
}

export async function fetchDialogs(){
  return ensureOk(await getJSON('/api/dialogs'), 'Failed to fetch dialogs');
}

export async function fetchContacts(){
  return ensureOk(await getJSON('/api/contacts'), 'Failed to fetch contacts');
}

export { API_BASE };
