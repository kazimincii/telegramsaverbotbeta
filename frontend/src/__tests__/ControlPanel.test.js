import React from 'react';
import { render, waitFor } from '../test-utils';

import ControlPanel from '../components/ControlPanel';
import { AppContext } from '../context/AppContext';
import { fetchDialogs } from '../services/api';

jest.mock('../services/api', () => ({
  fetchDialogs: jest.fn(),
}));

test('alerts on fetchDialogs error', async () => {
  fetchDialogs.mockRejectedValue(new Error('fail'));
  const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
  const value = { setDialogs: () => {}, cfg: { api_id:'', api_hash:'' } };
  render(
    <AppContext.Provider value={value}>
      <ControlPanel />
    </AppContext.Provider>
  );
  await waitFor(() => expect(alert).toHaveBeenCalledWith('fail'));
  alert.mockRestore();
});
