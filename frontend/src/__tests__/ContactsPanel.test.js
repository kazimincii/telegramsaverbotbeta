import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../services/api', () => ({
  fetchContacts: jest.fn(() => Promise.resolve({ ok: true, data: [{ id: 1, full_name: 'Alice' }] })),
}));

import { fetchContacts } from '../services/api';
import ContactsPanel from '../components/ContactsPanel';

test('renders contact list', async () => {
  render(<ContactsPanel />);
  await waitFor(() => expect(fetchContacts).toHaveBeenCalled());
  expect(await screen.findByText('Alice')).toBeInTheDocument();
});
