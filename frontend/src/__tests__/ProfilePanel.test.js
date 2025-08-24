import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import ProfilePanel from '../components/ProfilePanel';
import { AppContext } from '../context/AppContext';

test('renders API fields', () => {
  const value = {
    cfg: { api_id:'', api_hash:'' },
    setField: () => {},
    save: () => {},
  };
  render(
    <AppContext.Provider value={value}>
      <ProfilePanel />
    </AppContext.Provider>
  );
  expect(screen.getByLabelText(/API ID/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/API HASH/i)).toBeInTheDocument();
});
