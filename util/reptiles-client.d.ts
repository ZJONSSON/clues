import * as Bluebird from 'bluebird';
import * as clues from '../clues';

export interface ReptileOptions {
  /** Delay in milliseconds before fetching (default: 30) */
  delay?: number;
  /** Extra handler for processing responses */
  extraHandler?: (key: string, value: any) => void;
}

export interface ReptileObject extends clues.Logic {
  /** Queue of pending requests */
  $queue?: { [key: string]: Deferred<any> };
  /** Data cache */
  data?: { [key: string]: any };
  /** Input data for requests */
  $input?: any;
  /** Apply function for framework integration (e.g., Angular) */
  $applyFn?: () => void;
  /** External handler function */
  $external?: (ref: string) => Bluebird<any>;
  /** Render function bound to this object */
  $render?: (element: HTMLElement, tiles?: any) => Bluebird<any>;
  /** Render all function bound to this object */
  $renderAll?: (element?: HTMLElement | Document, tiles?: any) => Bluebird<any>;
  /** API sub-object */
  api?: ReptileObject;
}

export interface Deferred<T> {
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  promise: Bluebird<T>;
}

export interface Tiles {
  [key: string]: any;
}

/**
 * Global map of active reptile requests for external cancellation
 */
export const reptileRequests: { [uuid: string]: XMLHttpRequest };

/**
 * Creates an $external function for batched API requests
 *
 * @param options - Configuration options for the external handler
 * @returns Function that queues requests and batches them
 */
export function external(options?: ReptileOptions): (ref: string) => Bluebird<any>;

/**
 * Renders a single element using reptile data binding
 *
 * @param obj - The reptile object containing data and logic
 * @param element - DOM element with data-reptile attribute
 * @param tiles - Template/tile definitions
 * @returns Promise resolving to the rendered value
 */
export function render(
  obj: ReptileObject,
  element: HTMLElement,
  tiles?: Tiles
): Bluebird<any>;

/**
 * Renders all elements with data-reptile attributes
 *
 * @param obj - The reptile object containing data and logic
 * @param element - Container element (defaults to document)
 * @param tiles - Template/tile definitions
 * @returns Promise that settles when all renders complete
 */
export function renderAll(
  obj: ReptileObject,
  element?: HTMLElement | Document,
  tiles?: Tiles
): Bluebird<Bluebird.Inspection<any>[]>;

/**
 * Sets up a reptile API object with data binding capabilities
 *
 * @param obj - Object to enhance with reptile capabilities
 * @param options - Configuration options
 * @returns Enhanced object with reptile API
 */
export function api(obj?: ReptileObject, options?: ReptileOptions): ReptileObject;
