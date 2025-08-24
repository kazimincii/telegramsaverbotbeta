import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import LogViewer from '../components/LogViewer';
import { AppContext } from '../context/AppContext';

test('renders logs', () => {
  const div = document.createElement('div');
  const value = { log: ['a','b'], clearLog: ()=>{} };
  const root = ReactDOM.createRoot(div);
  act(() => { root.render(<AppContext.Provider value={value}><LogViewer /></AppContext.Provider>); });
  expect(div.textContent).toMatch(/Logları Temizle/);
  expect(div.textContent).toMatch(/a\nb/);
});
