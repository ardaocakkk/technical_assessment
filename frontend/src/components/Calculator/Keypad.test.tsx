import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Keypad } from './Keypad';

describe('Keypad', () => {
  it('calls onDigit when a digit button is clicked', async () => {
    const onDigit = vi.fn();
    render(<Keypad onDigit={onDigit} onOperation={vi.fn()} onEquals={vi.fn()} onClear={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '7' }));

    expect(onDigit).toHaveBeenCalledWith('7');
  });

  it('calls onOperation with ADD when + is clicked', async () => {
    const onOperation = vi.fn();
    render(<Keypad onDigit={vi.fn()} onOperation={onOperation} onEquals={vi.fn()} onClear={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '+' }));

    expect(onOperation).toHaveBeenCalledWith('ADD');
  });

  it('calls onEquals when = is clicked', async () => {
    const onEquals = vi.fn();
    render(<Keypad onDigit={vi.fn()} onOperation={vi.fn()} onEquals={onEquals} onClear={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '=' }));

    expect(onEquals).toHaveBeenCalled();
  });

  it('calls onClear when C is clicked', async () => {
    const onClear = vi.fn();
    render(<Keypad onDigit={vi.fn()} onOperation={vi.fn()} onEquals={vi.fn()} onClear={onClear} />);

    await userEvent.click(screen.getByRole('button', { name: 'C' }));

    expect(onClear).toHaveBeenCalled();
  });
});
