import IMessage = require("./IMessage");
import ISubscription = require("./ISubscription");
import IAddress = require("./IAddress");

interface IRoutingStrategy
{
    publish(message: IMessage): void;
    subscribe(subscription: ISubscription, retrieveOldMessages?: boolean): void;
    unsubscribe(id: string): void;
    join(domain: IAddress): void;
}

export = IRoutingStrategy;