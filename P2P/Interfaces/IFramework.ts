import IAddress = require("./IAddress");
import IMessage = require("./IMessage");
import Guid = require("../Utilities/Guid");

interface IFramework
{
    publish<TContents>(tags: Array<string>, contents: TContents): void;
    subscribe<TContents>(tags: Array<string>, filter: (m: IMessage<TContents>) => boolean, callback: (m: IMessage<TContents>) => void): Guid;
    unsubscribe(id: Guid): void;
    join(domain: IAddress): void;

    // TODO: Register content interfaces (TContents).
    // TODO: Validate data according to JSON Schema (a.k.a. TContents)
    // TODO: Watch out for malicious filter functions in .subscribe().
}

export = IFramework;