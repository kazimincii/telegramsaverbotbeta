import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import ControlPanel from '../components/ControlPanel';
import { AppContext } from '../context/AppContext';
import { fetchDialogs } from '../services/api';

jest.mock('../services/api', () => ({
  fetchDialogs: jest.fn(),
}));

test('handles fetchDialogs error', async () => {
  fetchDialogs.mockRejectedValue(new Error('fail'));
  const value = { setDialogs: () => {} };
  render(
    <AppContext.Provider value={value}>
      <ControlPanel />
    </AppContext.Provider>
  );
  await waitFor(() => expect(fetchDialogs).toHaveBeenCalled());
});
