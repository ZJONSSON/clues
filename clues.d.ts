import * as Bluebird from 'bluebird';

export = clues;

/**
 * Main clues function that resolves logic/facts objects with dependency resolution
 * @param logic - The object containing logic/facts (or a function/promise that delivers this object)
 * @param fn - Reference to property/function requested (string path, function, or array-defined function)
 * @param $global - Optional global object whose properties are accessible from any scope
 * @param caller - Internal: which reference is requesting each property
 * @param fullref - Internal: delimited list of the traversed dependency path
 * @returns A promise that resolves to the requested value
 */
declare function clues<T = any>(
  logic: clues.Logic | Function | Promise<clues.Logic>,
  fn: string | clues.LogicFunction<T> | clues.ArrayDefinedFunction<T>,
  $global?: clues.Global,
  caller?: string,
  fullref?: string
): Bluebird<T>;

declare namespace clues {
  /**
   * Bluebird Promise constructor used by clues
   */
  export let Promise: typeof Bluebird;

  /**
   * Creates a rejected promise with clues error format
   * @param error - Error object or message
   */
  export function reject(error: any): Bluebird<never>;

  /**
   * Logic object type - can contain static values, functions, promises, and nested objects
   */
  export interface Logic {
    [key: string]: any;
  }

  /**
   * Global object type - contains properties accessible from any scope
   */
  export interface Global {
    [key: string]: any;
    $logError?: (error: CluesError, fullref: string) => void;
    $duration?: (ref: string, time: [number, number], caller?: string) => void;
  }

  /**
   * Logic function type - function that will be resolved by clues
   */
  export type LogicFunction<T = any> = (...args: any[]) => T | Promise<T>;

  /**
   * Array-defined function type - Angular-style dependency injection
   * Last element must be a function, prior elements are argument names
   * First element can optionally be an object/function to provide scope
   */
  export type ArrayDefinedFunction<T = any> =
    | [...string[], LogicFunction<T>]
    | [Logic | Function, ...string[], LogicFunction<T>];

  /**
   * Error object returned by clues with enhanced metadata
   */
  export interface CluesError extends Error {
    /** The property name that raised the error */
    ref?: string;
    /** The name of the calling function */
    caller?: string;
    /** Full path of traversal to the erroring function */
    fullref?: string;
    /** Indicates this is an error object */
    error: true;
    /** Indicates the property was not defined */
    notDefined?: boolean;
    /** Additional error details */
    value?: any;
    /** Whether error should be reported */
    report?: boolean;
    /** Cache information */
    cache?: any;
    /** Whether error has been logged already */
    cluesHasLogged?: boolean;
  }

  /**
   * Special function markers and reserved argument names
   */
  export interface SpecialMarkers {
    /** Marks function as private - only accessible indirectly */
    $private: boolean;
    /** Marks function for preprocessing before becoming a service */
    $prep: boolean;
    /** Returns the caller reference */
    $caller: string;
    /** Returns the full reference path */
    $fullref: string;
    /** Returns the global object */
    $global: Global;
  }

  /**
   * Property handler function type for missing properties
   */
  export type PropertyHandler = (ref: string) => any;

  /**
   * External handler function type for undefined paths
   */
  export type ExternalHandler = (ref: string) => any;

  /**
   * Logic object with $property handler
   */
  export interface LogicWithProperty extends Logic {
    $property: PropertyHandler;
  }

  /**
   * Logic object with $external handler
   */
  export interface LogicWithExternal extends Logic {
    $external: ExternalHandler;
  }

  /**
   * Service function type - functions prefixed with $ that are not executed
   */
  export type ServiceFunction = (...args: any[]) => any;
}
