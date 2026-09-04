export type OperationType =
  | 'ADD'
  | 'SUBTRACT'
  | 'MULTIPLY'
  | 'DIVIDE'
  | 'EXPONENT'
  | 'SQRT'
  | 'PERCENTAGE';

export interface CalculationRequest {
  operation: OperationType;
  operandA: number;
  operandB?: number;
}

export interface CalculationResponse {
  result: number;
}

export interface ApiError {
  message: string;
  timestamp: string;
}

/** Operations that take only operandA (mirrors backend OperationType.isUnary()). */
export const UNARY_OPERATIONS: readonly OperationType[] = ['SQRT'];

export function isUnaryOperation(operation: OperationType): boolean {
  return UNARY_OPERATIONS.includes(operation);
}

export interface HistoryEntry {
  id: number;
  operation: OperationType;
  operandA: number;
  operandB: number | null;
  result: number;
  createdAt: string;
}
