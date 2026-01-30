import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Settings } from '../pages/Settings';

describe('Settings', () => {
  it('renders settings placeholder', () => {
    render(<Settings />);
    expect(screen.getByText('Ayarlar')).toBeInTheDocument();
  });
});
