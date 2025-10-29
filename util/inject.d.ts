import * as Bluebird from 'bluebird';
import * as clues from '../clues';

/**
 * Injects properties at specified paths into a base object using clues resolution
 *
 * @param obj - The base object to inject properties into
 * @param prop - Object mapping full paths (dot notation) to values to inject
 * @param $global - Global object required for clues resolution
 * @returns Promise that resolves to the modified object
 *
 * @example
 * inject(obj, { 'user.name': 'John', 'user.email': 'john@example.com' }, $global)
 *   .then(modifiedObj => console.log(modifiedObj))
 */
declare function inject(
  obj: clues.Logic,
  prop: { [path: string]: any },
  $global: clues.Global
): Bluebird<clues.Logic>;

export = inject;
