import Crypto = require("crypto");
import Express = require("express");
import Constants = require("./constants");

class Helpers
{
    public static hash(address: string)
    {
        var sha1 = Crypto.createHash("sha1");
        sha1.update(address);
        return parseInt("0x" + sha1.digest("hex").slice(0, Math.floor(Constants.SpaceSize / 4)));
    }

    public static inRangeExclusive(key: number, lowerExclusive: number, upperExclusive: number)
    {
        return lowerExclusive < upperExclusive
                   ? (lowerExclusive < key && key < upperExclusive)
                   : (lowerExclusive < key) || (key < upperExclusive);
    }

    public static inRangeInclusive(key: number, lowerExclusive: number, upperInclusive: number)
    {
        return lowerExclusive < upperInclusive
                   ? (lowerExclusive < key && key <= upperInclusive)
                   : (lowerExclusive < key) || (key <= upperInclusive);
    }

    public static sender(request: Express.Request)
    {
        return (request.headers["X-Forwarded-For"]
            || request.connection.remoteAddress) + ":" + request.get("host").split(":")[1];
    }
}

export = Helpers;