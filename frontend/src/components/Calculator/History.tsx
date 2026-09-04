import type { HistoryEntry } from '../../types/calculator';

interface HistoryProps {
  entries: HistoryEntry[];
}

export function History({ entries }: HistoryProps) {
  if (entries.length === 0) {
    return (
      <div data-testid="history" className="mt-4 text-xs text-neutral-400">
        No calculations yet.
      </div>
    );
  }

  return (
    <ul data-testid="history" className="mt-4 max-h-32 space-y-1 overflow-y-auto text-xs text-neutral-300">
      {entries.map((entry) => (
        <li key={entry.id} className="flex justify-between border-b border-neutral-700 py-1">
          <span>
            {entry.operandA} {entry.operation} {entry.operandB ?? ''} = {entry.result}
          </span>
          <span className="text-neutral-500">{new Date(entry.createdAt).toLocaleTimeString()}</span>
        </li>
      ))}
    </ul>
  );
}
