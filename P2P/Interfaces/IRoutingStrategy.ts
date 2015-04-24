import IMessage = require("./IMessage");
import ISubscription = require("./ISubscription");
import IAddress = require("./IAddress");

interface IRoutingStrategy
{
    publish<TContents>(message: IMessage<TContents>): void;
    subscribe<TContents>(subscription: ISubscription<TContents>): void;
    unsubscribe(id: string): void;
    join(domain: IAddress): void;
}

export = IRoutingStrategy;