import IMessage = require("./IMessage");
import Guid = require("../Core/Guid");

interface ISubscription<TContents>
{
    id: Guid;
    callback: (s: IMessage<TContents>) => void;
    filter: (s: IMessage<TContents>) => boolean;
    tags: Array<string>;
}

export = ISubscription;