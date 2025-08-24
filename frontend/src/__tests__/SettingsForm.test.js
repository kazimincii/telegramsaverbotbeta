import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import SettingsForm from '../components/SettingsForm';
import { AppContext } from '../context/AppContext';

test('renders settings inputs', () => {
  const div = document.createElement('div');
  const value = { cfg: { api_id:'', api_hash:'', session:'', out:'', types:[], dry_run:false }, setField: ()=>{}, save: ()=>{} };
  const root = ReactDOM.createRoot(div);
  act(() => { root.render(<AppContext.Provider value={value}><SettingsForm /></AppContext.Provider>); });
  expect(div.textContent).toMatch(/API ID/);
  expect(div.textContent).toMatch(/Kaydet/);
});
