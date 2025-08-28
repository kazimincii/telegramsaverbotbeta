import { fetchConfig } from '../services/api';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test('fetchConfig throws detailed error on failure', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 500,
    text: () => Promise.resolve('{"detail":"boom"}')
  });
  await expect(fetchConfig()).rejects.toMatchObject({
    status: 500,
    body: { detail: 'boom' }
  });
});
