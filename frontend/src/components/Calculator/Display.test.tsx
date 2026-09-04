import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Display } from './Display';

describe('Display', () => {
  it('renders the current expression using the operator symbol, not the enum name', () => {
    render(<Display operandA="2" operation="ADD" operandB="3" result={null} error={null} />);
    expect(screen.getByTestId('display')).toHaveTextContent('2 + 3');
  });

  it('renders the result when present', () => {
    render(<Display operandA="2" operation="ADD" operandB="3" result="5" error={null} />);
    expect(screen.getByTestId('display')).toHaveTextContent('5');
  });

  it('renders the error message when present', () => {
    render(<Display operandA="5" operation="DIVIDE" operandB="0" result={null} error="Cannot divide by zero" />);
    expect(screen.getByTestId('display')).toHaveTextContent('Cannot divide by zero');
  });
});
