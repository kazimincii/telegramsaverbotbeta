import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
codex/fix-syntax-errors-in-components-ei8dp2


jest.mock('../services/api', () => ({
  fetchDialogs: jest.fn(() => Promise.resolve({ ok: true, data: [] }))
}));

import { fetchDialogs } from '../services/api';
main
import SettingsForm from '../components/SettingsForm';
import { AppContext } from '../context/AppContext';

test('renders settings inputs', () => {
  const value = {
codex/fix-syntax-errors-in-components-ei8dp2
    cfg: { api_id:'', api_hash:'', session:'', out:'', types:[], dry_run:false, chats: [] },
    setField: () => {},
    save: () => {},
    dialogs: [],

    cfg: { api_id: '', api_hash: '', session: '', out: '', types: [], dry_run: false, chats: [] },
    setField: () => {},
    save: () => {},
    dialogs: [],
    setDialogs: () => {},
main
  };
  render(
    <AppContext.Provider value={value}>
      <SettingsForm />
    </AppContext.Provider>
  );
  expect(screen.getByLabelText(/API ID/i)).toBeInTheDocument();
  expect(screen.getByText(/Kaydet/)).toBeInTheDocument();
});

test('renders chat checkboxes', async () => {
  const setField = jest.fn();
codex/fix-syntax-errors-in-components-ei8dp2

  const dialogs = [{ id: 1, name: 'Group1' }, { id: 2, name: 'Group2' }];
  fetchDialogs.mockResolvedValueOnce({ ok: true, data: dialogs });
main
  const value = {
    cfg: { chats: [] },
    setField,
    save: () => {},
codex/fix-syntax-errors-in-components-ei8dp2
    dialogs: [{ id: 1, name: 'Group1' }, { id: 2, name: 'Group2' }],

    dialogs: [],
    setDialogs: () => {},
main
  };
  render(
    <AppContext.Provider value={value}>
      <SettingsForm />
    </AppContext.Provider>
  );
  const checkbox = await screen.findByLabelText('Group1');
  expect(checkbox).toBeInTheDocument();
  fireEvent.click(checkbox);
  await waitFor(() => expect(setField).toHaveBeenCalled());
});
