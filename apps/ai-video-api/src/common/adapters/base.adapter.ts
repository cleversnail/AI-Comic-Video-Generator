export interface KeyValidationResult {
  valid: boolean;
  message?: string;
  balance?: number;
}

export interface BaseAdapter {
  readonly provider: string;
  readonly modelId: string;
  validateKey(apiKey: string): Promise<KeyValidationResult>;
}
