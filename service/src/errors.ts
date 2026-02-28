export interface SerializedError {
  name?: string;
  message: string;
  code?: string;
  command?: string;
  responseStatus?: string;
  responseText?: string;
  stack?: string;
  cause?: unknown;
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const withFields = error as Error & {
      code?: string;
      command?: string;
      responseStatus?: string;
      responseText?: string;
      cause?: unknown;
    };

    return {
      name: withFields.name,
      message: withFields.message,
      code: withFields.code,
      command: withFields.command,
      responseStatus: withFields.responseStatus,
      responseText: withFields.responseText,
      stack: withFields.stack,
      cause: withFields.cause,
    };
  }

  return {
    message: String(error),
  };
}
