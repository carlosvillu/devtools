// Correlación por request vía AsyncLocalStorage (observability.md §3.2).
// Así CUALQUIER capa loguea con el request_id sin prop drilling del logger a
// través de firmas que no lo necesitan.
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Logger } from '@app/core/observability';
import { getRootLogger } from './logger';

interface RequestContext {
  log: Logger;
  requestId: string;
}

const als = new AsyncLocalStorage<RequestContext>();

export const runWithRequestContext = <T>(ctx: RequestContext, fn: () => T): T => als.run(ctx, fn);

/** Fuera de una request (arranque, tareas sueltas) cae al logger base. */
export const getRequestLogger = (): Logger => als.getStore()?.log ?? getRootLogger();

export const getRequestId = (): string | undefined => als.getStore()?.requestId;
