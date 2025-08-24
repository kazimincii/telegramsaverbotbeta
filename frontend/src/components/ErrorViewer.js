import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import MinimalButton from './MinimalButton';
import clearIcon from '../assets/clear.svg';

export default function ErrorViewer(){
  const { errors, clearErrors } = useContext(AppContext);
  return (
    <div style={{marginTop:16}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <div style={{fontSize:12,color:'#555'}}>Hatalar</div>
        <MinimalButton icon={clearIcon} onClick={clearErrors}>Temizle</MinimalButton>
      </div>
      <div style={{maxHeight:300,overflowY:'auto',border:'1px solid #d0d0d0',borderRadius:10,padding:8}}>
        {errors.map((e,i)=>(
          <div key={i} style={{padding:'4px 0',borderBottom:'1px solid #eee',color:'#c00',fontSize:12}}>{e}</div>
        ))}
        {errors.length===0 && <div style={{fontSize:12,color:'#999'}}>Hata yok</div>}
      </div>
    </div>
  );
}
