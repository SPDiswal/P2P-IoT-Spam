import Guid = require("../Utilities/Guid");

interface IMessage<TContents>
{
    id: Guid;
    contents: TContents;
    tags: Array<string>;
}

export = IMessage;