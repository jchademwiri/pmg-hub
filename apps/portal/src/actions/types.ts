export type ActionSuccess<T = void> = {
  success: true;
  data: T;
  error?: never;
};

export type ActionFailure = {
  success: false;
  error: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;
