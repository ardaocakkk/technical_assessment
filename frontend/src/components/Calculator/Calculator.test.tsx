import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Calculator } from './Calculator';
import * as calculatorApi from '../../api/calculatorApi';

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Calculator', () => {
  beforeEach(() => {
    vi.spyOn(calculatorApi, 'fetchHistory').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('starts a fresh expression after pressing a digit following a result', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockResolvedValue({ result: 5 });
    renderWithClient(<Calculator />);

    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: '=' }));
    await waitFor(() => expect(screen.getByTestId('display')).toHaveTextContent('5'));

    await userEvent.click(screen.getByRole('button', { name: '9' }));

    expect(screen.getByTestId('display')).toHaveTextContent('9');
  });

  it('chains operations by evaluating the pending calculation first', async () => {
    const calculateSpy = vi.spyOn(calculatorApi, 'calculate');
    calculateSpy.mockResolvedValueOnce({ result: 5 }).mockResolvedValueOnce({ result: 20 });
    renderWithClient(<Calculator />);

    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: '×' }));
    await waitFor(() => expect(calculateSpy).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: '4' }));
    await userEvent.click(screen.getByRole('button', { name: '=' }));

    await waitFor(() => expect(screen.getByTestId('display')).toHaveTextContent('20'));
    expect(calculateSpy).toHaveBeenNthCalledWith(1, { operation: 'ADD', operandA: 2, operandB: 3 });
    expect(calculateSpy).toHaveBeenNthCalledWith(2, { operation: 'MULTIPLY', operandA: 5, operandB: 4 });
  });

  it('refuses a second decimal point when typed through the keypad', async () => {
    renderWithClient(<Calculator />);

    await userEvent.click(screen.getByRole('button', { name: '1' }));
    await userEvent.click(screen.getByRole('button', { name: '.' }));
    await userEvent.click(screen.getByRole('button', { name: '5' }));
    await userEvent.click(screen.getByRole('button', { name: '.' }));
    await userEvent.click(screen.getByRole('button', { name: '9' }));

    expect(screen.getByTestId('display')).toHaveTextContent('1.59');
  });

  it('supports entering a calculation via the keyboard', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockResolvedValue({ result: 5 });
    renderWithClient(<Calculator />);

    await userEvent.keyboard('2+3{Enter}');

    await waitFor(() => expect(screen.getByTestId('display')).toHaveTextContent('5'));
    expect(calculatorApi.calculate).toHaveBeenCalledWith({ operation: 'ADD', operandA: 2, operandB: 3 });
  });

  it('clears via the Escape key', async () => {
    renderWithClient(<Calculator />);

    await userEvent.keyboard('7');
    expect(screen.getByTestId('display')).toHaveTextContent('7');

    await userEvent.keyboard('{Escape}');

    expect(screen.getByTestId('display')).toHaveTextContent('0');
  });

  it('allows entering a negative first operand', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockResolvedValue({ result: -2 });
    renderWithClient(<Calculator />);

    await userEvent.click(screen.getByRole('button', { name: '-' }));
    expect(screen.getByTestId('display')).toHaveTextContent('-');

    await userEvent.click(screen.getByRole('button', { name: '5' }));
    await userEvent.click(screen.getByRole('button', { name: '+' }));
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: '=' }));

    await waitFor(() => expect(screen.getByTestId('display')).toHaveTextContent('-2'));
    expect(calculatorApi.calculate).toHaveBeenCalledWith({ operation: 'ADD', operandA: -5, operandB: 3 });
  });

  it('supports decimal points and the multiply/divide symbols via the keyboard', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockResolvedValue({ result: 20 });
    renderWithClient(<Calculator />);

    await userEvent.keyboard('1.5*4{Enter}');

    await waitFor(() => expect(screen.getByTestId('display')).toHaveTextContent('20'));
    expect(calculatorApi.calculate).toHaveBeenCalledWith({ operation: 'MULTIPLY', operandA: 1.5, operandB: 4 });
  });
});
