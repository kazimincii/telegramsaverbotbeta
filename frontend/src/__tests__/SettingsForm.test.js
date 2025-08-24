import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../services/api', () => ({
  fetchDialogs: jest.fn(() => Promise.resolve({ ok: true, data: [] })),
}));

import { fetchDialogs } from '../services/api';
import SettingsForm from '../components/SettingsForm';
import { AppContext } from '../context/AppContext';

test('renders settings inputs', () => {
  const value = {
    cfg: { api_id:'', api_hash:'', session:'', out:'', types:[], dry_run:false, chats: [] },
    setField: () => {},
    save: () => {},
    dialogs: [],
    setDialogs: () => {},
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
  const dialogs = [{ id: 1, name: 'Group1' }, { id: 2, name: 'Group2' }];
  fetchDialogs.mockResolvedValueOnce({ ok: true, data: dialogs });
  const value = {
    cfg: { chats: [] },
    setField,
    save: () => {},
    dialogs: [],
    setDialogs: () => {},
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
