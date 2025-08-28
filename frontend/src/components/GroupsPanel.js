import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Panel from './Panel';

export default function GroupsPanel(){
  const { cfg, setField, dialogs } = useContext(AppContext);
  return (
    <Panel>
      <div style={{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
        {dialogs.map(d => {
          const idStr = String(d.id);
          const selected = (cfg.chats || []).map(String).includes(idStr);
          const counts = d.counts || {};
          return (
            <label
              key={idStr}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: '1px solid #eee',
                padding: '4px 0'
              }}
            >
              {/* explicit tick marker for clarity */}
              <span style={{ width: 12, textAlign: 'center' }}>
                {selected ? '✓' : ''}
              </span>
              <input
                type="checkbox"
                aria-label={d.name}
                checked={selected}
                onChange={e => {
                  const s = new Set((cfg.chats || []).map(String));
                  if (e.target.checked) s.add(idStr);
                  else s.delete(idStr);
                  setField('chats', Array.from(s));
                }}
              />
              {d.photo && (
                <img
                  src={d.photo}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: '50%' }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div>{d.name}</div>
                <div style={{ fontSize: 12, color: '#555' }}>
                  {d.username ? `@${d.username}` : ''} {d.id}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#555',
                  whiteSpace: 'nowrap'
                }}
              >
                📷 {counts.photos || 0} | 📄 {counts.documents || 0} | 🎞️{' '}
                {counts.videos || 0}
              </div>
            </label>
          );
        })}
        {dialogs.length === 0 && <div style={{fontSize:12,color:'#999'}}>Grup bulunamadı</div>}
      </div>
    </Panel>
  );
}
