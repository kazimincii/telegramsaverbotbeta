import { render, screen } from '@testing-library/react';
import FaqSection from '../components/FaqSection';

test('shows FAQ heading and contact email', () => {
  render(<FaqSection />);
  expect(screen.getByText(/Sıkça Sorulan Sorular/i)).toBeInTheDocument();
  const link = screen.getByRole('link', { name: /admin@zyvaarch.com/i });
  expect(link).toHaveAttribute('href', 'mailto:admin@zyvaarch.com');
});
