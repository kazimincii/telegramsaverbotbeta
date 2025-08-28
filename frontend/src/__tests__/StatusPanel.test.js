import React from 'react';
import { render, screen } from '../test-utils';
import StatusPanel from '../components/StatusPanel';
import { AppContext } from '../context/AppContext';

test('renders status information', () => {
  const value = { running: true, progress: { chat: 'chat1', downloaded: 1, skipped: 0 }, start: ()=>{}, stop: ()=>{}, cfg:{} };
  render(
    <AppContext.Provider value={value}>
      <StatusPanel />
    </AppContext.Provider>
  );
  expect(screen.getByText(/Çalışıyor/)).toBeInTheDocument();
  expect(screen.getByText(/chat1/)).toBeInTheDocument();
});
