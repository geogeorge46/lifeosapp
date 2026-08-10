import { AsyncLocalStorage } from "async_hooks";

export interface AuthStore {
  userId: string;
}

export const authContext = new AsyncLocalStorage<AuthStore>();
