export type RuntimeEnv = {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  exit: (code: number) => void;
};

export function createRuntime(): RuntimeEnv {
  return {
    log: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
    exit: (code) => process.exit(code),
  };
}

export const defaultRuntime: RuntimeEnv = createRuntime();
