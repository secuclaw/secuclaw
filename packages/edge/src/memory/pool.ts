export class ObjectPool<T> {
  private readonly pool: T[] = [];

  constructor(
    private readonly factory: () => T,
    private readonly reset: (value: T) => void,
    private readonly maxSize: number = 128,
  ) {}

  acquire(): T {
    const instance = this.pool.pop();
    return instance ?? this.factory();
  }

  release(value: T): void {
    this.reset(value);
    if (this.pool.length < this.maxSize) {
      this.pool.push(value);
    }
  }

  drain(): void {
    this.pool.length = 0;
  }

  size(): number {
    return this.pool.length;
  }
}
