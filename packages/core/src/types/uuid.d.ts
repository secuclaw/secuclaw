/**
 * Type declarations for uuid module
 */

declare module "uuid" {
  export function v1(options?: V1Options, buffer?: Uint8Array, offset?: number): string;
  export function v1(options?: V1Options, buffer?: Uint8Array, offset?: number): Uint8Array;
  
  export function v3(name: string | Uint8Array, namespace: string | Uint8Array, buffer?: Uint8Array, offset?: number): string;
  export function v3(name: string | Uint8Array, namespace: string | Uint8Array, buffer?: Uint8Array, offset?: number): Uint8Array;
  
  export function v4(options?: V4Options, buffer?: Uint8Array, offset?: number): string;
  export function v4(options?: V4Options, buffer?: Uint8Array, offset?: number): Uint8Array;
  
  export function v5(name: string | Uint8Array, namespace: string | Uint8Array, buffer?: Uint8Array, offset?: number): string;
  export function v5(name: string | Uint8Array, namespace: string | Uint8Array, buffer?: Uint8Array, offset?: number): Uint8Array;
  
  export function validate(uuid: string | Uint8Array): boolean;
  export function version(uuid: string | Uint8Array): number;
  
  export interface V1Options {
    node?: Uint8Array;
    clockseq?: number;
    msecs?: number | Date;
    nsecs?: number;
    random?: Uint8Array;
    rng?: () => Uint8Array;
  }
  
  export interface V4Options {
    random?: Uint8Array;
    rng?: () => Uint8Array;
  }
  
  export const NIL: string;
  export const parse: (uuid: string) => Uint8Array;
  export const stringify: (arr: Uint8Array, offset?: number) => string;
}
