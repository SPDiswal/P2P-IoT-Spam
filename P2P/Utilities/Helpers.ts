import Crypto = require("crypto");
import Q = require("q");
import Promise = Q.Promise;

import Constants = require("../../P2P.Chord/Core/Constants");

class Helpers
{
    public static hash(value: string, size: number = Math.floor(Constants.SpaceSize / 4)): number
    {
        var sha1 = Crypto.createHash("sha1");
        sha1.update(value);
        return parseInt("0x" + sha1.digest("hex").slice(0, size));
    }

    public static inRangeExclusive(key: number, lowerExclusive: number, upperExclusive: number): boolean
    {
        return lowerExclusive < upperExclusive
                   ? (lowerExclusive < key && key < upperExclusive)
                   : (lowerExclusive < key) || (key < upperExclusive);
    }

    public static inRangeInclusive(key: number, lowerExclusive: number, upperInclusive: number): boolean
    {
        return lowerExclusive < upperInclusive
                   ? (lowerExclusive < key && key <= upperInclusive)
                   : (lowerExclusive < key) || (key <= upperInclusive);
    }

    public static resolvedPromise<T>(value: T = (void 0)): Promise<T>
    {
        var deferred = Q.defer<T>();
        deferred.resolve(value);
        return deferred.promise;
    }

    public static resolvedUnit(): Promise<void>
    {
        var deferred = Q.defer<void>();
        deferred.resolve((void 0));
        return deferred.promise;
    }

    // Borrowed from http://stackoverflow.com/a/17238793
    public static promiseWhile(condition: () => boolean, body: () => Promise<any>): Promise<void>
    {
        var deferred = Q.defer<void>();

        function loop()
        {
            if (!condition()) deferred.resolve((void 0));
            else Q.when(body(), loop, deferred.reject);
        }

        Q.nextTick(loop);
        return deferred.promise;
    }
}

export = Helpers;