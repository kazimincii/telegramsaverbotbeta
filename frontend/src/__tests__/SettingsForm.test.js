import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsForm from '../components/SettingsForm';
import { AppContext } from '../context/AppContext';

test('renders settings inputs', () => {
  const value = {
    cfg: { api_id:'', api_hash:'', session:'', out:'', types:[], dry_run:false },
    setField: ()=>{},
    save: ()=>{},
    dialogs: [],
  };
  render(
    <AppContext.Provider value={value}>
      <SettingsForm />
    </AppContext.Provider>
  );
  expect(screen.getByLabelText(/API ID/i)).toBeInTheDocument();
  expect(screen.getByText(/Kaydet/)).toBeInTheDocument();
});
