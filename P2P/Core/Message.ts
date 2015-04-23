import Guid = require("../Core/Guid");
import GuidGenerator = require("../Utilities/GuidGenerator");
import IGuidGenerator = require("../Interfaces/IGuidGenerator");
import IMessage = require("../Interfaces/IMessage");

class Message<TContents> implements IMessage<TContents>
{
    private _id: Guid;

    constructor(private _contents: TContents, private _tags: string[], generator: IGuidGenerator = new GuidGenerator())
    {
        this._id = generator.create();
    }

    public get id(): Guid
    {
        return this._id;
    }

    public get contents(): TContents
    {
        return this._contents;
    }

    public get tags(): string[]
    {
        return this._tags;
    }

    public equals(that: Message<TContents>): boolean
    {
        return this._id.equals(that._id);
    }
}

export = Message;