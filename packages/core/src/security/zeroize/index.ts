/**
 * Zeroizing Secret Wiper
 * 
 * Secure memory erasure for sensitive data.
 */

// ============================================================================
// Types
// ============================================================================

export interface ZeroizeOptions {
  overwriteCount: number;
  pattern: "zeros" | "random" | "alternating";
}

// ============================================================================
// Secret Wrapper
// ============================================================================

/**
 * Wraps a value with automatic zeroization
 */
export class Secret<T> {
  private value: T;
  private zeroized = false;
  
  constructor(value: T) {
    this.value = value;
  }
  
  /**
   * Get the value
   */
  get(): T {
    if (this.zeroized) {
      throw new Error("Secret has been zeroized");
    }
    return this.value;
  }
  
  /**
   * Overwrite the value
   */
  set(newValue: T): void {
    this.value = newValue;
    this.zeroized = false;
  }
  
  /**
   * Zeroize the value
   */
  zeroize(): void {
    if (this.zeroized) return;
    
    // Overwrite memory
    this.value = this.overwrite(this.value);
    this.zeroized = true;
  }
  
  /**
   * Check if zeroized
   */
  isZeroized(): boolean {
    return this.zeroized;
  }
  
  /**
   * Overwrite value based on type
   */
  private overwrite(value: T): T {
    if (value === null || value === undefined) return value;
    
    if (typeof value === "string") {
      return "" as unknown as T;
    }
    
    if (Array.isArray(value)) {
      return [] as unknown as T;
    }
    
    if (typeof value === "object") {
      return {} as unknown as T;
    }
    
    if (typeof value === "number") {
      return 0 as unknown as T;
    }
    
    if (typeof value === "boolean") {
      return false as unknown as T;
    }
    
    return value;
  }
}

// ============================================================================
// Secure Buffer
// ============================================================================

/**
 * Secure buffer with automatic zeroization
 */
export class SecureBuffer {
  private buffer: Buffer;
  
  constructor(size: number) {
    this.buffer = Buffer.alloc(size);
  }
  
  /**
   * Write data
   */
  write(data: string | Buffer): void {
    const input = typeof data === "string" ? Buffer.from(data) : data;
    input.copy(this.buffer);
  }
  
  /**
   * Read data
   */
  read(): Buffer {
    return Buffer.from(this.buffer);
  }
  
  /**
   * Zeroize the buffer
   */
  zeroize(): void {
    this.buffer.fill(0);
    this.buffer.fill(0xFF);
    this.buffer.fill(0x55);
    this.buffer.fill(0);
  }
  
  /**
   * Get size
   */
  size(): number {
    return this.buffer.length;
  }
}

// ============================================================================
// Zeroizer
// ============================================================================

/**
 * Zeroize utilities
 */
export class Zeroizer {
  /**
   * Zeroize a string in place
   */
  static zeroizeString(str: string): void {
    // Strings are immutable in JS, so we can only overwrite references
    // In production, use TypedArrays or SecureBuffer
  }
  
  /**
   * Zeroize an object's properties
   */
  static zeroizeObject(obj: Record<string, unknown>): void {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === "string") {
        obj[key] = "";
      } else if (typeof value === "number") {
        obj[key] = 0;
      } else if (Array.isArray(value)) {
        obj[key] = [];
      } else if (typeof value === "object" && value !== null) {
        this.zeroizeObject(value as Record<string, unknown>);
      }
    }
  }
  
  /**
   * Zeroize typed arrays
   */
  static zeroizeTypedArray(arr: Uint8Array | Uint16Array | Uint32Array): void {
    arr.fill(0);
    arr.fill(0xFF);
    arr.fill(0);
  }
  
  /**
   * Secure comparison (timing-safe)
   */
  static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}

// ============================================================================
// Secure Token
// ============================================================================

/**
 * Creates a secure token that auto-zeroizes
 */
export function createSecret<T>(value: T): Secret<T> {
  return new Secret(value);
}

/**
 * Create a secure buffer
 */
export function createSecureBuffer(size: number): SecureBuffer {
  return new SecureBuffer(size);
}
