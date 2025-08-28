global.IS_REACT_ACT_ENVIRONMENT = true;

expect.extend({
  toBeInTheDocument(received) {
    const pass = document.body.contains(received);
    return {
      pass,
      message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
    };
  },
  toHaveAttribute(received, name, value) {
    const pass = received.hasAttribute(name) &&
      (value === undefined || received.getAttribute(name) === String(value));
    return {
      pass,
      message: () => `expected element ${pass ? 'not ' : ''}to have attribute ${name}${value !== undefined ? `="${value}"` : ''}`,
    };
  }
});

afterEach(() => {
  document.body.innerHTML = '';
});
