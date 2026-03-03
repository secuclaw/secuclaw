export interface StreamOptions {
  chunkSize: number;
  concurrency: number;
  onError: 'continue' | 'abort';
}

export const DEFAULT_STREAM_OPTIONS: StreamOptions = {
  chunkSize: 100,
  concurrency: 5,
  onError: 'continue',
};

export interface ChunkResult<T> {
  chunkIndex: number;
  items: T[];
  processed: number;
  errors: Error[];
}

export interface StreamProgress {
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  currentChunk: number;
  totalChunks: number;
  startTime: Date;
  elapsedMs: number;
  itemsPerSecond: number;
  estimatedRemainingMs: number;
}

export type ProgressCallback = (progress: StreamProgress) => void;

export async function* chunkArray<T>(
  array: T[],
  chunkSize: number
): AsyncGenerator<T[], void, unknown> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}

export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: Partial<StreamOptions> = {},
  onProgress?: ProgressCallback
): Promise<ChunkResult<R>[]> {
  const config = { ...DEFAULT_STREAM_OPTIONS, ...options };
  const results: ChunkResult<R>[] = [];
  const totalItems = items.length;
  const totalChunks = Math.ceil(totalItems / config.chunkSize);
  const startTime = new Date();
  
  let processedItems = 0;
  let successfulItems = 0;
  let failedItems = 0;

  for await (const chunk of chunkArray(items, config.chunkSize)) {
    const chunkIndex = Math.floor(processedItems / config.chunkSize);
    const chunkResults: R[] = [];
    const chunkErrors: Error[] = [];

    const batchPromises = chunk.map(async (item, localIndex) => {
      const globalIndex = chunkIndex * config.chunkSize + localIndex;
      try {
        const result = await processor(item, globalIndex);
        successfulItems++;
        return { success: true as const, result };
      } catch (error) {
        failedItems++;
        if (config.onError === 'abort') {
          throw error;
        }
        return { success: false as const, error: error as Error };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const r of batchResults) {
      if (r.success) {
        chunkResults.push(r.result);
      } else {
        chunkErrors.push(r.error);
      }
    }

    processedItems += chunk.length;

    results.push({
      chunkIndex,
      items: chunkResults,
      processed: chunk.length,
      errors: chunkErrors,
    });

    if (onProgress) {
      const elapsedMs = Date.now() - startTime.getTime();
      onProgress({
        totalItems,
        processedItems,
        successfulItems,
        failedItems,
        currentChunk: chunkIndex + 1,
        totalChunks,
        startTime,
        elapsedMs,
        itemsPerSecond: processedItems / (elapsedMs / 1000),
        estimatedRemainingMs: (elapsedMs / processedItems) * (totalItems - processedItems),
      });
    }
  }

  return results;
}

export async function processConcurrent<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await processor(items[index], index);
    }
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

export async function* streamFile(
  filePath: string,
  options: Partial<{ encoding: BufferEncoding; chunkSize: number }> = {}
): AsyncGenerator<string, void, unknown> {
  const { encoding = 'utf-8', chunkSize = 65536 } = options;
  
  const file = Bun.file(filePath);
  const stream = file.stream();
  const decoder = new TextDecoder(encoding);
  const reader = stream.getReader();
  
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (buffer.length > 0) {
          yield buffer;
        }
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      while (buffer.length >= chunkSize) {
        const chunk = buffer.slice(0, chunkSize);
        buffer = buffer.slice(chunkSize);
        yield chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamLines(
  filePath: string,
  options: Partial<{ encoding: BufferEncoding; skipEmpty: boolean }> = {}
): AsyncGenerator<string, void, unknown> {
  const { encoding = 'utf-8', skipEmpty = true } = options;
  
  const file = Bun.file(filePath);
  const stream = file.stream();
  const decoder = new TextDecoder(encoding);
  const reader = stream.getReader();
  
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (buffer.length > 0) {
          const line = buffer.trim();
          if (!skipEmpty || line.length > 0) {
            yield line;
          }
        }
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!skipEmpty || trimmed.length > 0) {
          yield trimmed;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamJsonArray<T>(
  filePath: string,
  options: Partial<{ chunkSize: number }> = {}
): AsyncGenerator<T, void, unknown> {
  const { chunkSize = 100 } = options;
  const batch: T[] = [];
  
  for await (const line of streamLines(filePath)) {
    try {
      const item = JSON.parse(line) as T;
      batch.push(item);
      
      if (batch.length >= chunkSize) {
        yield* batch;
        batch.length = 0;
      }
    } catch {
      // Skip invalid JSON lines
    }
  }
  
  if (batch.length > 0) {
    yield* batch;
  }
}

export async function* streamPaginated<T>(
  fetcher: (page: number, pageSize: number) => Promise<{ items: T[]; hasMore: boolean }>,
  options: Partial<{ pageSize: number; maxPages: number }> = {}
): AsyncGenerator<T[], void, unknown> {
  const { pageSize = 100, maxPages = Infinity } = options;
  let page = 0;

  while (page < maxPages) {
    const result = await fetcher(page, pageSize);
    
    if (result.items.length === 0) {
      break;
    }
    
    yield result.items;
    
    if (!result.hasMore || result.items.length < pageSize) {
      break;
    }
    
    page++;
  }
}

export class DataStream<T> {
  private buffer: T[] = [];
  private bufferSize: number;
  private flushCallback: (items: T[]) => Promise<void>;
  private flushPromise: Promise<void> = Promise.resolve();

  constructor(
    flushCallback: (items: T[]) => Promise<void>,
    bufferSize: number = 100
  ) {
    this.bufferSize = bufferSize;
    this.flushCallback = flushCallback;
  }

  async write(item: T): Promise<void> {
    this.buffer.push(item);
    
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async writeMany(items: T[]): Promise<void> {
    for (const item of items) {
      await this.write(item);
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const toFlush = [...this.buffer];
    this.buffer = [];
    
    await this.flushPromise;
    this.flushPromise = this.flushCallback(toFlush);
    await this.flushPromise;
  }

  async close(): Promise<void> {
    await this.flush();
  }
}

export class BatchProcessor<T, R> {
  private batch: Array<{ item: T; resolve: (value: R) => void; reject: (error: Error) => void }> = [];
  private batchSize: number;
  private batchTimeoutMs: number;
  private processor: (items: T[]) => Promise<R[]>;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    options: Partial<{ batchSize: number; batchTimeoutMs: number }> = {}
  ) {
    this.processor = processor;
    this.batchSize = options.batchSize ?? 50;
    this.batchTimeoutMs = options.batchTimeoutMs ?? 100;
  }

  async process(item: T): Promise<R> {
    if (this.closed) {
      throw new Error('BatchProcessor is closed');
    }

    return new Promise((resolve, reject) => {
      this.batch.push({ item, resolve, reject });

      if (this.batch.length >= this.batchSize) {
        this.flush();
      } else if (!this.timeoutId) {
        this.timeoutId = setTimeout(() => this.flush(), this.batchTimeoutMs);
      }
    });
  }

  private flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const batch = this.batch;
    this.batch = [];

    if (batch.length === 0) return;

    const items = batch.map(b => b.item);

    this.processor(items)
      .then(results => {
        batch.forEach((b, i) => b.resolve(results[i]));
      })
      .catch(error => {
        batch.forEach(b => b.reject(error));
      });
  }

  async close(): Promise<void> {
    this.closed = true;
    this.flush();
  }
}

export function createBackpressureController(options: Partial<{ highWaterMark: number; lowWaterMark: number }> = {}) {
  const highWaterMark = options.highWaterMark ?? 1000;
  const lowWaterMark = options.lowWaterMark ?? 100;
  let currentSize = 0;
  let resolveDrain: (() => void) | null = null;

  return {
    async acquire(items: number): Promise<void> {
      currentSize += items;
      
      while (currentSize > highWaterMark) {
        await new Promise<void>(resolve => {
          resolveDrain = resolve;
        });
      }
    },

    release(items: number): void {
      currentSize -= items;
      
      if (currentSize <= lowWaterMark && resolveDrain) {
        const resolve = resolveDrain;
        resolveDrain = null;
        resolve();
      }
    },

    get currentSize(): number {
      return currentSize;
    },

    get isPaused(): boolean {
      return currentSize > highWaterMark;
    },
  };
}
