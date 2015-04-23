import Guid = require("../Core/Guid");

interface IMessage<TContents>
{
    id: Guid;
    contents: TContents;
    tags: Array<string>;
}

export = IMessage;