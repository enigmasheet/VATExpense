export type ServiceOk<T> = { ok: true; data: T };
export type ServiceError = { ok: false; error: string };
export type ServiceResult<T> = ServiceOk<T> | ServiceError;
