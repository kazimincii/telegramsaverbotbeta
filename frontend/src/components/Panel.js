import React from 'react';

export default function Panel({ children, style, className = '' }) {
  return (
    <div className={`card ${className}`} style={style}>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}
