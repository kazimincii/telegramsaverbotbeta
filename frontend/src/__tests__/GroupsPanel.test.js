import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import GroupsPanel from '../components/GroupsPanel';
import { AppContext } from '../context/AppContext';

test('renders group checkboxes', () => {
  const setField = jest.fn();
  const value = {
    cfg: { chats: [] },
    setField,
    dialogs: [
      { id: 1, name: 'Group1', username: 'g1', counts: { photos: 1, videos: 2, documents: 3 } }
    ],
  };
  render(
    <AppContext.Provider value={value}>
      <GroupsPanel />
    </AppContext.Provider>
  );
  const checkbox = screen.getByLabelText('Group1');
  expect(checkbox).toBeInTheDocument();
  fireEvent.click(checkbox);
  expect(setField).toHaveBeenCalled();
});
