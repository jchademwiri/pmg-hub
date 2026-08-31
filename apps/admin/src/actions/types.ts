/**
 * Standardized Server Action return types adhering to Backend Mastery protocol.
 */

export type ActionSuccess<T = void> = {
  success: true;
  data: T;
  error?: never;
  code?: never;
  fieldErrors?: never;
};

export type ActionFailure = {
  success: false;
  error: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  data?: never;
};

export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;

export function actionSuccess<T>(data: T): ActionSuccess<T> {
  return { success: true, data };
}

export function actionVoidSuccess(): ActionSuccess<void> {
  return { success: true, data: undefined };
}

export function actionFailure(
  error: string,
  options?: { code?: string; fieldErrors?: Record<string, string[]> }
): ActionFailure {
  return {
    success: false,
    error,
    code: options?.code,
    fieldErrors: options?.fieldErrors,
  };
}
