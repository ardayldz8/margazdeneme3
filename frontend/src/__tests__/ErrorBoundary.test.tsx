import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';

const Thrower = () => {
  throw new Error('Boom');
};

describe('ErrorBoundary', () => {
  it('renders fallback UI on error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );

    expect(screen.getByText('Beklenmedik hata')).toBeInTheDocument();
    expect(screen.getByText('Bir sorun oluştu')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('reloads the page when the button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    const originalLocation = window.location;

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload }
    });

    try {
      render(
        <ErrorBoundary>
          <Thrower />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Sayfayı yenile' }));
      expect(reload).toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation
      });
      consoleSpy.mockRestore();
    }
  });
});
