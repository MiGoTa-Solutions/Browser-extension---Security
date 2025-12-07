const LOG_NAMESPACE = '[SecureShield]';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogPayload {
  context: string;
  message: string;
  data?: Record<string, unknown> | undefined;
}

function emit(level: LogLevel, payload: LogPayload) {
  const parts = [LOG_NAMESPACE, payload.context, payload.message];
  const output = parts.filter(Boolean).join(' ');

  if (payload.data) {
    console[level](output, payload.data);
  } else {
    console[level](output);
  }
}

export const logInfo = (context: string, message: string, data?: Record<string, unknown>) =>
  emit('info', { context, message, data });

export const logWarn = (context: string, message: string, data?: Record<string, unknown>) =>
  emit('warn', { context, message, data });

export const logError = (context: string, message: string, data?: Record<string, unknown>) =>
  emit('error', { context, message, data });
