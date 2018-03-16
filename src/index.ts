/**
 * This file is part of the vscode-helpers distribution.
 * Copyright (c) Marcel Joachim Kloubert.
 *
 * vscode-helpers is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * vscode-helpers is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import * as _ from 'lodash';
import * as Crypto from 'crypto';
import * as Enumerable from 'node-enumerable';
import * as Glob from 'glob';
const MergeDeep = require('merge-deep');
import * as Moment from 'moment';
import * as OS from 'os';
import * as Path from 'path';
import * as vscode from 'vscode';
import * as vscode_workflows from './workflows';

export * from './disposable';
export * from './logging';
export { from } from 'node-enumerable';
export * from './progress';
export * from './workflows';
export * from './workspaces';

/**
 * Action for 'forEachAsync()' function.
 *
 * @param {T} item The current item.
 * @param {number} index The zero based index.
 * @param {T[]} array The array of all elements.
 *
 * @return {TResult|PromiseLike<TResult>} The result.
 */
export type ForEachAsyncAction<T, TResult> = (item: T, index: number, array: T[]) => TResult | PromiseLike<TResult>;

/**
 * An action for 'invokeAfter()' function.
 *
 * @param {any[]} [args] The arguments for the action.
 *
 * @return {TResult|PromiseLike<TResult>} The result of the action.
 */
export type InvokeAfterAction<TResult = any> = (...args: any[]) => TResult | PromiseLike<TResult>;

/**
 * Describes a simple 'completed' action.
 *
 * @param {any} err The occurred error.
 * @param {TResult} [result] The result.
 */
export type SimpleCompletedAction<TResult> = (err: any, result?: TResult) => void;

/**
 * Normalizes a string.
 *
 * @param {TStr} str The value to normalize.
 *
 * @return {string} The normalized string.
 */
export type StringNormalizer<TStr = string> = (str: TStr) => string;

/**
 * Additional options for 'waitWhile()' function.
 */
export interface WaitWhileOptions {
    /**
     * A timeout, in milliseconds.
     */
    timeout?: number;
    /**
     * The optional time, in milliseconds, to wait until next check.
     */
    timeUntilNextCheck?: number;
}

/**
 * Applies a function for a specific object / value.
 *
 * @param {TFunc} func The function.
 * @param {any} [thisArgs] The object to apply to the function.
 *
 * @return {TFunc} The wrapped function.
 */
export function applyFuncFor<TFunc extends Function = Function>(
    func: TFunc, thisArgs: any
): TFunc {
    return <any>function() {
        return func.apply(thisArgs, arguments);
    };
}

/**
 * Returns a value as array.
 *
 * @param {T|T[]} val The value.
 * @param {boolean} [removeEmpty] Remove items that are (null) / (undefined) or not.
 *
 * @return {T[]} The value as array.
 */
export function asArray<T>(val: T | T[], removeEmpty = true): T[] {
    removeEmpty = toBooleanSafe(removeEmpty, true);

    return (_.isArray(val) ? val : [ val ]).filter(i => {
        if (removeEmpty) {
            return !_.isNil(i);
        }

        return true;
    });
}

/**
 * Returns a value as local Moment instance.
 *
 * @param {any} val The input value.
 *
 * @return {Moment.Moment} The output value.
 */
export function asLocalTime(val: any): Moment.Moment {
    let localTime: Moment.Moment;

    if (!_.isNil(val)) {
        if (Moment.isMoment(val)) {
            localTime = val;
        } else if (Moment.isDate(val)) {
            localTime = Moment( val );
        } else {
            localTime = Moment( toStringSafe(val) );
        }
    }

    if (localTime) {
        if (!localTime.isLocal()) {
            localTime = localTime.local();
        }
    }

    return localTime;
}

/**
 * Returns a value as UTC Moment instance.
 *
 * @param {any} val The input value.
 *
 * @return {Moment.Moment} The output value.
 */
export function asUTC(val: any): Moment.Moment {
    let utcTime: Moment.Moment;

    if (!_.isNil(val)) {
        if (Moment.isMoment(val)) {
            utcTime = val;
        } else if (Moment.isDate(val)) {
            utcTime = Moment( val );
        } else {
            utcTime = Moment( toStringSafe(val) );
        }
    }

    if (utcTime) {
        if (!utcTime.isUTC()) {
            utcTime = utcTime.utc();
        }
    }

    return utcTime;
}

/**
 * Clones an object / value deep.
 *
 * @param {T} val The value / object to clone.
 *
 * @return {T} The cloned value / object.
 */
export function cloneObject<T>(val: T): T {
    if (!val) {
        return val;
    }

    return JSON.parse(
        JSON.stringify(val)
    );
}

/**
 * Compares two values for a sort operation.
 *
 * @param {T} x The left value.
 * @param {T} y The right value.
 *
 * @return {number} The "sort value".
 */
export function compareValues<T>(x: T, y: T): number {
    if (x !== y) {
        if (x > y) {
            return 1;
        } else if (x < y) {
            return -1;
        }
    }

    return 0;
}

/**
 * Compares values by using a selector.
 *
 * @param {T} x The left value.
 * @param {T} y The right value.
 * @param {Function} selector The selector.
 *
 * @return {number} The "sort value".
 */
export function compareValuesBy<T, U>(x: T, y: T,
                                      selector: (t: T) => U): number {
    return compareValues(selector(x),
                         selector(y));
}

/**
 * Creates a simple 'completed' callback for a promise.
 *
 * @param {Function} resolve The 'succeeded' callback.
 * @param {Function} reject The 'error' callback.
 *
 * @return {SimpleCompletedAction<TResult>} The created action.
 */
export function createCompletedAction<TResult = any>(resolve: (value?: TResult | PromiseLike<TResult>) => void,
                                                     reject?: (reason: any) => void): SimpleCompletedAction<TResult> {
    let completedInvoked = false;

    return (err, result?) => {
        if (completedInvoked) {
            return;
        }
        completedInvoked = true;

        if (err) {
            if (reject) {
                reject(err);
            }
        } else {
            if (resolve) {
                resolve(result);
            }
        }
    };
}

/**
 * Async 'forEach'.
 *
 * @param {Enumerable.Sequence<T>} items The items to iterate.
 * @param {Function} action The item action.
 * @param {any} [thisArg] The underlying object / value for the item action.
 *
 * @return {TResult} The result of the last action call.
 */
export async function forEachAsync<T, TResult>(items: Enumerable.Sequence<T>,
                                               action: ForEachAsyncAction<T, TResult>,
                                               thisArg?: any) {
    if (!_.isArray(items)) {
        items = Enumerable.from(items)
                          .toArray();
    }

    let lastResult: TResult;

    for (let i = 0; i < (<T[]>items).length; i++) {
        lastResult = await Promise.resolve(
            action.apply(thisArg,
                         [ items[i], i, items ]),
        );
    }

    return lastResult;
}

/**
 * Formats a string.
 *
 * @param {any} formatStr The value that represents the format string.
 * @param {any[]} [args] The arguments for 'formatStr'.
 *
 * @return {string} The formated string.
 */
export function format(formatStr: any, ...args: any[]): string {
    return formatArray(formatStr, args);
}

/**
 * Formats a string.
 *
 * @param {any} formatStr The value that represents the format string.
 * @param {any[]} [args] The arguments for 'formatStr'.
 *
 * @return {string} The formated string.
 */
export function formatArray(formatStr: any, args: any[]): string {
    formatStr = toStringSafe(formatStr);

    // apply arguments in
    // placeholders
    return formatStr.replace(/{(\d+)(\:)?([^}]*)}/g, (match, index, formatSeparator, formatExpr) => {
        index = parseInt(
            toStringSafe(index)
        );

        let resultValue = args[index];

        if (':' === formatSeparator) {
            // collect "format providers"
            let formatProviders = toStringSafe(formatExpr).split(',')
                                                          .map(x => x.toLowerCase().trim())
                                                          .filter(x => x);

            // transform argument by
            // format providers
            formatProviders.forEach(fp => {
                switch (fp) {
                    case 'ending_space':
                        resultValue = toStringSafe(resultValue);
                        if ('' !== resultValue) {
                            resultValue = resultValue + ' ';
                        }
                        break;

                    case 'leading_space':
                        resultValue = toStringSafe(resultValue);
                        if ('' !== resultValue) {
                            resultValue = ' ' + resultValue;
                        }
                        break;

                    case 'lower':
                        resultValue = toStringSafe(resultValue).toLowerCase();
                        break;

                    case 'trim':
                        resultValue = toStringSafe(resultValue).trim();
                        break;

                    case 'upper':
                        resultValue = toStringSafe(resultValue).toUpperCase();
                        break;

                    case 'surround':
                        resultValue = toStringSafe(resultValue);
                        if ('' !== resultValue) {
                            resultValue = "'" + toStringSafe(resultValue) + "'";
                        }
                        break;
                }
            });
        }

        if (_.isUndefined(resultValue)) {
            return match;
        }

        return toStringSafe(resultValue);
    });
}

/**
 * Promise version of 'Glob()' function.
 *
 * @param {string|string[]} patterns One or more patterns.
 * @param {Glob.IOptions} [opts] Custom options.
 *
 * @return {Promise<string[]>} The promise with the matches.
 */
export async function glob(patterns: string | string[], opts?: Glob.IOptions) {
    const DEFAULT_OPTS: Glob.IOptions = {
        absolute: true,
        dot: false,
        nocase: true,
        nodir: true,
        nonull: false,
        nosort: false,
        sync: false,
    };

    opts = MergeDeep({}, DEFAULT_OPTS, opts);

    const WF = vscode_workflows.buildWorkflow();

    WF.next(() => {
        return [];
    });

    asArray(patterns).forEach(p => {
        WF.next((allMatches: string[]) => {
            return new Promise<string[]>((res, rej) => {
                const COMPLETED = createCompletedAction(res, rej);

                try {
                    Glob(p, opts, (err, matches) => {
                        if (err) {
                            COMPLETED(err);
                        } else {
                            allMatches.push
                                      .apply(allMatches, matches);

                            COMPLETED(null, allMatches);
                        }
                    });
                } catch (e) {
                    COMPLETED(e);
                }
            });
        });
    });

    return Enumerable.from( await WF.start<string[]>() )
                     .select(m => Path.resolve(m))
                     .distinct()
                     .toArray();
}

/**
 * Invokes an action after a timeout.
 *
 * @param {Function} action The action to invoke.
 * @param {number} [ms] The custom time, in milliseconds, after the action should be invoked.
 * @param {any[]} [args] One or more arguments for the action.
 *
 * @return {Promise<TResult>} The promise with the result.
 */
export function invokeAfter<TResult = any>(action: InvokeAfterAction<TResult>, ms?: number, ...args: any[]) {
    const ACTION_ARGS = args.filter((x, index) => {
        return index >= 2;
    });

    ms = parseInt(
        toStringSafe(ms).trim()
    );
    if (isNaN(ms)) {
        ms = 1000;
    }

    return new Promise<TResult>((resolve, reject) => {
        const COMPLETED = createCompletedAction(resolve, reject);

        try {
            setTimeout(() => {
                try {
                    Promise.resolve(
                        action.apply(null, ACTION_ARGS),
                    ).then((result: TResult) => {
                        COMPLETED(null, result);
                    }).catch((err) => {
                        COMPLETED(err);
                    });
                } catch (e) {
                    COMPLETED(e);
                }
            }, ms);
        } catch (e) {
            COMPLETED(e);
        }
    });
}

/**
 * Normalizes a value as string so that is comparable.
 *
 * @param {any} val The value to convert.
 * @param {StringNormalizer} [normalizer] The custom normalizer.
 *
 * @return {string} The normalized value.
 */
export function normalizeString(val: any, normalizer?: StringNormalizer): string {
    if (!normalizer) {
        normalizer = (str) => str.toLowerCase().trim();
    }

    return normalizer( toStringSafe(val) );
}

/**
 * Promise version of 'crypto.randomBytes()' function.
 *
 * @param {number} size The size of the result.
 *
 * @return {Promise<Buffer>} The buffer with the random bytes.
 */
export function randomBytes(size: number) {
    size = parseInt(
        toStringSafe(size).trim()
    );

    return new Promise<Buffer>((resolve, reject) => {
        const COMPLETED = createCompletedAction(resolve, reject);

        Crypto.randomBytes(size, (err, buf) => {
            COMPLETED(err, buf);
        });
    });
}

/**
 * Waits a number of milliseconds.
 *
 * @param {number} [ms] The custom time, in milliseconds, to wait.
 */
export async function sleep(ms?: number) {
    await invokeAfter(() => {}, ms);
}

/**
 * Returns a sequence object as new array.
 *
 * @param {Enumerable.Sequence<T>} arr The input object.
 * @param {boolean} [normalize] Returns an empty array, if input object is (null) / (undefined).
 *
 * @return {T[]} The input object as array.
 */
export function toArray<T>(arr: Enumerable.Sequence<T>, normalize = true): T[] {
    if (_.isNil(arr)) {
        if (toBooleanSafe(normalize, true)) {
            return [];
        }

        return <any>arr;
    }

    if (!_.isArray(arr)) {
        return Enumerable.from( arr )
                         .toArray();
    }

    return arr.map(x => x);
}


/**
 * Returns a value as boolean, which is not (null) and (undefined).
 *
 * @param {any} val The value to convert.
 * @param {boolean} [defaultVal] The custom default value if 'val' is (null) or (undefined).
 *
 * @return {boolean} 'val' as boolean.
 */
export function toBooleanSafe(val: any, defaultVal = false): boolean {
    if (_.isBoolean(val)) {
        return val;
    }

    if (_.isNil(val)) {
        return !!defaultVal;
    }

    return !!val;
}

/**
 * Converts an EOL enum value to a string.
 *
 * @param {vscode.EndOfLine} [eol] The (optional) enum value.
 *
 * @return string The EOL string.
 */
export function toEOL(eol?: vscode.EndOfLine): string {
    switch (eol) {
        case vscode.EndOfLine.CRLF:
            return "\r\n";

        case vscode.EndOfLine.LF:
            return "\n";
    }

    return OS.EOL;
}

/**
 * Returns a value as string, which is not (null) and (undefined).
 *
 * @param {any} val The value to convert.
 * @param {string} [defaultVal] The custom default value if 'val' is (null) or (undefined).
 *
 * @return {string} 'val' as string.
 */
export function toStringSafe(val: any, defaultVal = ''): string {
    if (_.isString(val)) {
        return val;
    }

    if (_.isNil(val)) {
        return '' + defaultVal;
    }

    try {
        if (val instanceof Error) {
            return '' + val.message;
        }

        if (_.isFunction(val['toString'])) {
            return '' + val.toString();
        }

        if (_.isObject(val)) {
            return JSON.stringify(val);
        }
    } catch { }

    return '' + val;
}

/**
 * Tries to clear an interval.
 *
 * @param {NodeJS.Timer} intervalId The timeout (ID).
 *
 * @return {boolean} Operation was successfull or not.
 */
export function tryClearInterval(intervalId: NodeJS.Timer): boolean {
    try {
        if (!_.isNil(intervalId)) {
            clearInterval(intervalId);
        }

        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Tries to clear a timeout.
 *
 * @param {NodeJS.Timer} timeoutId The timeout (ID).
 *
 * @return {boolean} Operation was successfull or not.
 */
export function tryClearTimeout(timeoutId: NodeJS.Timer): boolean {
    try {
        if (!_.isNil(timeoutId)) {
            clearTimeout(timeoutId);
        }

        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Waits while a predicate matches.
 *
 * @param {Function} predicate The predicate.
 * @param {WaitWhileOptions} {opts} Additional options.
 *
 * @return {Promise<boolean>} The promise that indicates if timeout reached (false) or not (true).
 */
export async function waitWhile(predicate: () => boolean | PromiseLike<boolean>,
                                opts?: WaitWhileOptions) {
    if (!opts) {
        opts = <any>{};
    }

    const TIME_UNTIL_NEXT_CHECK = parseInt(
        toStringSafe(opts.timeUntilNextCheck).trim()
    );

    const TIMEOUT = parseInt(
        toStringSafe(opts.timeout).trim()
    );

    let runUntil: Moment.Moment | false = false;
    if (!isNaN(TIMEOUT)) {
        runUntil = Moment.utc()
                         .add(TIMEOUT, 'ms');
    }

    let wait: boolean;
    do {
        const NOW = Moment.utc();

        if (false !== runUntil) {
            if (runUntil.isAfter(NOW)) {
                return false;
            }
        }

        wait = toBooleanSafe(
            await Promise.resolve(
                predicate()
            )
        );

        if (wait) {
            if (!isNaN(TIME_UNTIL_NEXT_CHECK)) {
                await sleep(TIME_UNTIL_NEXT_CHECK);  // wait before next check
            }
        }
    }
    while (wait);

    return true;
}
