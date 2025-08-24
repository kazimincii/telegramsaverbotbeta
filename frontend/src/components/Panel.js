import React from 'react';

export default function Panel({ children, style }) {
  return (
    <div style={{background:'#fff',border:'1px solid #ddd',borderRadius:10,padding:16,...style}}>
      {children}
    </div>
  );
}
