import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LogViewer from '../components/LogViewer';
import { AppContext } from '../context/AppContext';

test('renders logs', () => {
  const value = { log: ['a','b'], clearLog: ()=>{} };
  render(
    <AppContext.Provider value={value}>
      <LogViewer />
    </AppContext.Provider>
  );
  expect(screen.getByText(/Logları Temizle/)).toBeInTheDocument();
  expect(screen.getByText(/a\nb/)).toBeInTheDocument();
});
