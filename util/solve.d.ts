type Fn = (...a: any[]) => any;

/* ───────────────────────── Depth tools ───────────────────────── */
type Depth = 0|1|2|3|4|5;
type Dec<N extends Depth> =
  N extends 5 ? 4 : N extends 4 ? 3 : N extends 3 ? 2 : N extends 2 ? 1 : N extends 1 ? 0 : 0;

/* Deep-await & see-through functions/arrays/objects, depth-limited. */
type DeepAwaitedN<T, N extends Depth = 4> =
  N extends 0 ? T :
  T extends Promise<infer U> ? DeepAwaitedN<U, Dec<N>> :
  T extends Fn ? DeepAwaitedN<ReturnType<T>, Dec<N>> :
  T extends readonly any[] ? { [I in keyof T]: DeepAwaitedN<T[I], Dec<N>> } :
  T extends object ? { [K in keyof T]: DeepAwaitedN<T[K], Dec<N>> } :
  T;

/* Navigable selector view. Methods -> ReturnType, then deep resolve. */
// Unwrap only the immediate Promise from async function return types, not full evaluation
type UnwrapAsyncFn<T> =
  T extends (...args: any[]) => Promise<infer U> ? U
  : T extends Fn ? ReturnType<T>
  : T;

type DomainN<T, N extends Depth = 5> =
  N extends 0 ? T :
  T extends Promise<infer U> ? DomainN<U, Dec<N>> :
  T extends Fn ? DomainN<ReturnType<T>, Dec<N>> :
  T extends readonly any[] ? { [I in keyof T]: DomainN<T[I], Dec<N>> }
  : T extends object
    ? ('$property' extends keyof T
        ? (T['$property'] extends (ref: any) => infer R
            ? { [key: string]: DomainN<R, Dec<N>> }
            : { [K in keyof T]: DomainN<T[K] extends Fn ? ReturnType<T[K]> : T[K], Dec<N>> })
        : { [K in keyof T]: DomainN<T[K] extends Fn ? ReturnType<T[K]> : T[K], Dec<N>> })
  : T;

/* Prevent the selector from re-driving inference of T. */
type NoInfer<T> = [T][T extends any ? 0 : never];

/* ─────────────────────── Path proxy (typed) ─────────────────────── */
export const PATH: unique symbol;
declare const TYPE_BRAND: unique symbol;

type Brand<T> = { readonly [TYPE_BRAND]: T };
type TupleKeys<T extends readonly any[]> = Exclude<keyof T, keyof any[]>;

/* Extract string index signature type if it exists */
type StringIndexType<T> = T extends { [key: string]: infer V } ? V : never;

type PathProxy<T> =
  T extends readonly any[]
    ? Brand<T> & { readonly [PATH]: string; readonly $path: string }
      & { [K in TupleKeys<T>]: PathProxy<T[K]> }
      & { [n: number]: PathProxy<T[number]> }
  : T extends object
    ? Brand<T> & { readonly [PATH]: string; readonly $path: string }
      & { [K in keyof T]: PathProxy<T[K]> }
      & (StringIndexType<T> extends never ? {} : { [key: string]: PathProxy<StringIndexType<T>> })
  : Brand<T> & { readonly [PATH]: string; readonly $path: string };

/* ─────────────────────────── solve API ─────────────────────────── */

/** Single pick -> single value */
export function solve<T, R>(
  obj: T,
  selector: (p: DomainN<NoInfer<T>, 5>) => R,
  global?: any
): Promise<DeepAwaitedN<R, 4>>;

/** Tuple/array of picks -> tuple/array of values */
export function solve<T, Arr extends readonly unknown[]>(
  obj: T,
  selector: (p: DomainN<NoInfer<T>, 5>) => Arr,
  global?: any
): Promise<{ [K in keyof Arr]: DeepAwaitedN<Arr[K], 4> }>;

/* ───────────────────── Convenience type helper ───────────────────── */
export type AsValue<T> = T extends Fn ? DeepAwaitedN<ReturnType<T>> : DeepAwaitedN<T>;
