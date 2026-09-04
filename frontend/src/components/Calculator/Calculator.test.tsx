import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Calculator } from './Calculator';
import * as calculatorApi from '../../api/calculatorApi';
import { useCalculatorStore } from '../../store/calculatorStore';

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Calculator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useCalculatorStore.getState().reset();
  });

  it('performs a calculation end-to-end and shows the result', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockResolvedValue({ result: 5 });
    renderWithClient(<Calculator />);

    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: '=' }));

    await waitFor(() => expect(screen.getByTestId('display')).toHaveTextContent('5'));
  });

  it('shows an error message when the API call fails', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockRejectedValue(new Error('Cannot divide by zero'));
    renderWithClient(<Calculator />);

    await userEvent.click(screen.getByRole('button', { name: '5' }));
    await userEvent.click(screen.getByRole('button', { name: '÷' }));
    await userEvent.click(screen.getByRole('button', { name: '0' }));
    await userEvent.click(screen.getByRole('button', { name: '=' }));

    await waitFor(() =>
      expect(screen.getByTestId('display')).toHaveTextContent('Cannot divide by zero'),
    );
  });

  it('clear resets the display', async () => {
    renderWithClient(<Calculator />);

    await userEvent.click(screen.getByRole('button', { name: '7' }));
    await userEvent.click(screen.getByRole('button', { name: 'C' }));

    expect(screen.getByTestId('display')).toHaveTextContent('0');
  });
});
