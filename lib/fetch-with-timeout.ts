export function createFetchWithTimeout(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const sourceSignal = init?.signal;
    const abortFromSource = () => controller.abort();

    if (sourceSignal?.aborted) {
      controller.abort();
    } else {
      sourceSignal?.addEventListener("abort", abortFromSource, { once: true });
    }

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
      sourceSignal?.removeEventListener("abort", abortFromSource);
    }
  };
}
