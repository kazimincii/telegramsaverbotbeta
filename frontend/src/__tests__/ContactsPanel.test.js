import React from 'react';
import { render, screen, waitFor } from '../test-utils';
import * as api from '../services/api';
import ContactsPanel from '../components/ContactsPanel';

api.fetchContacts = jest.fn(() => Promise.resolve({ ok: true, data: [{ id: 1, full_name: 'Alice' }] }));
const { fetchContacts } = api;

test('renders contact list', async () => {
  render(<ContactsPanel />);
  await waitFor(() => expect(fetchContacts).toHaveBeenCalled());
  expect(await screen.findByText('Alice')).toBeInTheDocument();
});
