import Guid = require("../Core/Guid");
import GuidGenerator = require("../Utilities/GuidGenerator");
import IGuidGenerator = require("../Interfaces/IGuidGenerator");
import IMessage = require("../Interfaces/IMessage");
import ISubscription = require("../Interfaces/ISubscription");

class Subscription<TContents> implements ISubscription<TContents>
{
    private _id: Guid;

    constructor(private _tags: string[], private _filter: (s: IMessage<TContents>) => boolean = () => true, generator: IGuidGenerator = new GuidGenerator())
    {
        this._id = generator.create();
    }

    public callback(s: IMessage<TContents>): void { }

    public get id(): Guid
    {
        return this._id;
    }

    public get tags(): string[]
    {
        return this._tags;
    }

    public get filter(): (s: IMessage<TContents>) => boolean
    {
        return this._filter;
    }

    public equals(that: Subscription<TContents>): boolean
    {
        return this._id.equals(that._id);
    }
}

export = Subscription;