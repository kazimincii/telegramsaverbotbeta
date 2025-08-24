import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import StatusPanel from '../components/StatusPanel';
import { AppContext } from '../context/AppContext';

test('renders status information', () => {
  const div = document.createElement('div');
  const value = { running: true, progress: { chat: 'chat1', downloaded: 1, skipped: 0 }, start: ()=>{}, stop: ()=>{}, cfg:{} };
  const root = ReactDOM.createRoot(div);
  act(() => { root.render(<AppContext.Provider value={value}><StatusPanel /></AppContext.Provider>); });
  expect(div.textContent).toMatch(/Çalışıyor/);
  expect(div.textContent).toMatch(/chat1/);
});
