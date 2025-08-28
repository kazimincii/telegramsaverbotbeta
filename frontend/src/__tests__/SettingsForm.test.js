import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';

import SettingsForm from '../components/SettingsForm';
import { AppContext } from '../context/AppContext';

test('renders settings inputs', () => {
  const value = {
    cfg: { session:'', out:'', types:[], dry_run:false },
    setField: () => {},
    save: () => {},
  };
  render(
    <AppContext.Provider value={value}>
      <SettingsForm />
    </AppContext.Provider>
  );
  expect(screen.getByLabelText(/Session/i)).toBeInTheDocument();
  expect(screen.getByText(/Kaydet/)).toBeInTheDocument();
});

test('alerts on save errors', async () => {
  const save = jest.fn().mockRejectedValue(new Error('fail'));
  const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
  const value = {
    cfg: { session:'', out:'', types:[], dry_run:false },
    setField: () => {},
    save,
  };
  render(
    <AppContext.Provider value={value}>
      <SettingsForm />
    </AppContext.Provider>
  );
  fireEvent.click(screen.getByText(/Kaydet/));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('fail'));
  alert.mockRestore();
});
