import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { History } from './History';

describe('History', () => {
  it('renders an empty state with no entries', () => {
    render(<History entries={[]} />);
    expect(screen.getByTestId('history')).toHaveTextContent('No calculations yet.');
  });

  it('renders a list of entries', () => {
    render(
      <History
        entries={[
          { id: 1, operation: 'ADD', operandA: 2, operandB: 3, result: 5, createdAt: '2026-09-05T00:00:00.000Z' },
        ]}
      />,
    );
    expect(screen.getByTestId('history')).toHaveTextContent('2 ADD 3 = 5');
  });
});
