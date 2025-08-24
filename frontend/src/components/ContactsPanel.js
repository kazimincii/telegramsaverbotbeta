import React, { useEffect, useState } from 'react';
import { fetchContacts } from '../services/api';

export default function ContactsPanel(){
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchContacts().then(r => {
      if (!alive) return;
      if (r.ok && Array.isArray(r.data)) setItems(r.data);
      else if (r.error) setError(r.error.message || 'Kişiler alınamadı');
    });
    return () => { alive = false; };
  }, []);

  return (
    <div style={{marginTop:16}}>
      <div style={{fontSize:12,color:'#555',marginBottom:6}}>Kişiler</div>
      {error && <div style={{color:'#c00',marginBottom:8}}>{error}</div>}
      <div style={{maxHeight:300,overflowY:'auto',border:'1px solid #d0d0d0',borderRadius:10,padding:8}}>
        {items.map(it => (
          <div key={it.id} style={{padding:'4px 0',borderBottom:'1px solid #eee'}}>
            {it.full_name || it.username || it.phone || it.id}
          </div>
        ))}
        {items.length === 0 && <div style={{fontSize:12,color:'#999'}}>Kişi bulunamadı</div>}
      </div>
    </div>
  );
}
