import * as Bluebird from 'bluebird';
import * as clues from '../clues';

export interface ReptileServerOptions {
  /** Global object to use for clues resolution */
  $global?: clues.Global;
  /** Whether to output in quiet mode (suppress response writes) */
  quiet?: boolean;
  /** Whether to pretty print JSON output */
  pretty?: boolean | number;
  /** Whether to enable debug mode */
  debug?: boolean;
  /** Array or comma-separated string of properties to select */
  select?: string[] | string;
  /** Whether to return single response instead of chunked */
  single?: boolean;
  /** Custom stringify function for serialization */
  stringify?: (obj: any, pretty?: boolean | number, debug?: boolean, req?: Request) => string;
  /** Logger function for internal errors */
  logger?: (error: clues.CluesError) => void;
}

export interface Request {
  /** Request body parameters */
  body?: { [key: string]: any };
  /** URL query parameters */
  query?: { [key: string]: any };
  /** URL route parameters */
  params?: { [key: string]: any; fn?: string };
  /** Request URL */
  url: string;
  /** Listen for request close/abort events */
  on(event: 'close', listener: () => void): void;
}

export interface Response {
  /** Set response header */
  set(name: string, value: string): Response;
  /** Write chunk to response */
  write(chunk: string): void;
  /** Flush response buffer */
  flush?(): void;
  /** End the response */
  end(data?: string): void;
  /** Set HTTP status code */
  status(code: number): Response;
}

export interface ExtendedGlobal extends clues.Global {
  /** Response object */
  res: Response;
  /** Request object */
  req: Request;
  /** Combined input from body, query, and params */
  input: { [key: string]: any };
  /** Duration statistics collector */
  $duration_stats: { [key: string]: any };
  /** Root facts object */
  root: clues.Logic;
  /** Emit property function for streaming responses */
  $emit_property: (ref: string, data: any, debug?: boolean) => void;
  /** Debug flag for reptile */
  reptileDebug?: boolean;
}

/**
 * Creates an Express/Connect-compatible middleware for serving clues logic as an API
 *
 * @param api - The logic/facts object or array to serve
 * @param options - Configuration options
 * @returns Middleware function
 *
 * @example
 * const reptileServer = require('clues/util/reptiles-server');
 * const api = { users: () => db.getUsers() };
 * app.get('/api/:fn', reptileServer(api, { debug: true }));
 */
declare function reptileServer(
  api?: clues.Logic | any[],
  options?: ReptileServerOptions
): (req: Request, res: Response) => Bluebird<void>;

export = reptileServer;
