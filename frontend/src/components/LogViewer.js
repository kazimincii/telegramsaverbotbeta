import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function LogViewer(){
  const { log, clearLog } = useContext(AppContext);
  return (
    <div style={{marginTop:16}}>
      <div style={{fontSize:12,color:'#555',marginBottom:6}}>Loglar</div>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <button onClick={clearLog}>Logları Temizle</button>
        <button onClick={()=>navigator.clipboard.writeText((log||[]).join("\n"))}>Kopyala</button>
      </div>
      <pre style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',fontSize:12,background:'#fafafa',border:'1px solid #e7e7e7',borderRadius:10,padding:10,height:340,overflow:'auto',whiteSpace:'pre-wrap'}}>
        {(log && log.length)?log.join("\n"):"Log bekleniyor..."}
      </pre>
    </div>
  );
}
