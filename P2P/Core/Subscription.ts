import GuidGenerator = require("../Utilities/GuidGenerator");
import IGuidGenerator = require("../Interfaces/IGuidGenerator");
import IMessage = require("../Interfaces/IMessage");
import ISubscription = require("../Interfaces/ISubscription");

class Subscription<TContents> implements ISubscription<TContents>
{
    constructor(private _callback: (s: IMessage<TContents>) => void,
                private _tags: string[],
                private _filter: (s: IMessage<TContents>) => boolean = () => true,
                generator: IGuidGenerator = new GuidGenerator())
    {
        this._id = generator.create();
    }

    private _id: string;

    public get id(): string
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

    public get callback(): (s: IMessage<TContents>) => void
    {
        return this._callback;
    }

    public equals(that: Subscription<TContents>): boolean
    {
        return this._id === that._id;
    }
}

export = Subscription;