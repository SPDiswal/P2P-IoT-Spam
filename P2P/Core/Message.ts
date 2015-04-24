import GuidGenerator = require("../Utilities/GuidGenerator");
import IGuidGenerator = require("../Interfaces/IGuidGenerator");
import IMessage = require("../Interfaces/IMessage");

class Message implements IMessage
{
    private _id: string;

    constructor(private _contents: any, private _tags: Array<string>, generator: IGuidGenerator = new GuidGenerator())
    {
        this._id = generator.create();
    }

    public get id(): string
    {
        return this._id;
    }

    public get contents(): any
    {
        return this._contents;
    }

    public get tags(): Array<string>
    {
        return this._tags;
    }

    public equals(that: Message): boolean
    {
        return this._id === that._id;
    }
}

export = Message;