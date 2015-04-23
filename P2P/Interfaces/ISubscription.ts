import IMessage = require("./IMessage");
import Guid = require("../Utilities/Guid");

interface ISubscription<TContents>
{
    id: Guid;
    callback: (s: IMessage<TContents>) => void;
    filter: (s: IMessage<TContents>) => boolean;
    tags: Array<string>;
}

export = ISubscription;