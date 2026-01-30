import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Reports } from '../pages/Reports';

describe('Reports', () => {
  it('renders placeholder content', () => {
    render(<Reports />);
    expect(screen.getByText('Raporlar Sayfası Hazırlanıyor')).toBeInTheDocument();
  });
});
