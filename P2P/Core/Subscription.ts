import GuidGenerator = require("../Utilities/GuidGenerator");
import IAddress = require("../Interfaces/IAddress");
import IGuidGenerator = require("../Interfaces/IGuidGenerator");
import IMessage = require("../Interfaces/IMessage");
import ISubscription = require("../Interfaces/ISubscription");

class Subscription implements ISubscription
{
    constructor(private _address: IAddress,
                private _callback: (s: IMessage) => void,
                private _tags: Array<string>,
                private _filter: (s: IMessage) => boolean = () => true,
                generator: IGuidGenerator = new GuidGenerator())
    {
        this._id = generator.create();
    }

    private _id: string;

    public get id(): string
    {
        return this._id;
    }

    public get address(): IAddress
    {
        return this._address;
    }

    public get tags(): Array<string>
    {
        return this._tags;
    }

    public get filter(): (s: IMessage) => boolean
    {
        return this._filter;
    }

    public get callback(): (s: IMessage) => void
    {
        return this._callback;
    }

    public equals(that: Subscription): boolean
    {
        return this._id === that._id;
    }
}

export = Subscription;