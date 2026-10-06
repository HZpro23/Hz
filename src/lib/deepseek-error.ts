export type DeepSeekErrorCode = "config" | "api" | "empty" | "invalid_json";

export class DeepSeekError extends Error {
  code: DeepSeekErrorCode;
  constructor(code: DeepSeekErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
