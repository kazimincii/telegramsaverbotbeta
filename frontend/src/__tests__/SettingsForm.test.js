import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../services/api', () => ({
  fetchDialogs: jest.fn(() => Promise.resolve({ ok: true, data: [] }))
}));

import SettingsForm from '../components/SettingsForm';
import { AppContext } from '../context/AppContext';

test('renders settings inputs', () => {
  const value = {
codex/add-group-selection-list-feature-08lv7i
    cfg: { api_id: '', api_hash: '', session: '', out: '', types: [], dry_run: false, chats: [] },
    setField: () => {},
    save: () => {}

    cfg: { api_id:'', api_hash:'', session:'', out:'', types:[], dry_run:false },
    setField: ()=>{},
    save: ()=>{},
    dialogs: [],
main
  };
  render(
    <AppContext.Provider value={value}>
      <SettingsForm dialogs={[]} />
    </AppContext.Provider>
  );
  expect(screen.getByLabelText(/API ID/i)).toBeInTheDocument();
  expect(screen.getByText(/Kaydet/)).toBeInTheDocument();
});

test('renders chat checkboxes', () => {
  const setField = jest.fn();
  const value = { cfg: { chats: [] }, setField, save: ()=>{} };
  const dialogs = [{ id: 1, name: 'Group1' }, { id: 2, name: 'Group2' }];
  render(
    <AppContext.Provider value={value}>
      <SettingsForm dialogs={dialogs} />
    </AppContext.Provider>
  );
  const checkbox = screen.getByLabelText('Group1');
  expect(checkbox).toBeInTheDocument();
  fireEvent.click(checkbox);
  expect(setField).toHaveBeenCalled();
});
