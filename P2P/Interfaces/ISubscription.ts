import IMessage = require("./IMessage");
import IAddress = require("./IAddress");

interface ISubscription
{
    id: string;
    address: IAddress;
    callback: (s: IMessage) => void;
    filter: (s: IMessage) => boolean;
    tags: Array<string>;
}

export = ISubscription;