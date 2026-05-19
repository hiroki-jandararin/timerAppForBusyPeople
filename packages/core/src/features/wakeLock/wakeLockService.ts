export type WakeLockService = {
  request: () => Promise<void>;
  release: () => Promise<void>;
};
