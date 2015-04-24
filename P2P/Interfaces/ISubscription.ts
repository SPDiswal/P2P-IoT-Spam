import IMessage = require("./IMessage");

interface ISubscription<TContents>
{
    id: string;
    callback: (s: IMessage<TContents>) => void;
    filter: (s: IMessage<TContents>) => boolean;
    tags: Array<string>;
}

export = ISubscription;