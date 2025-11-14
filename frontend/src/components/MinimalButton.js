import React from 'react';

export default function MinimalButton({ icon, children, style, ...props }) {
  return (
    <button
      {...props}
      style={{
        display:'inline-flex',
        alignItems:'center',
        gap:6,
        padding:'6px 12px',
        border:'1px solid #ccc',
        borderRadius:6,
        background:'#f5f5f5',
        cursor:'pointer',
        ...style
      }}
    >
      {icon && <img src={icon} alt="" style={{width:16,height:16}} />}
      {children}
    </button>
  );
}
