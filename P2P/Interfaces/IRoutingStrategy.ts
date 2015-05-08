import IMessage = require("./IMessage");
import ISubscription = require("./ISubscription");
import IAddress = require("./IAddress");

interface IRoutingStrategy
{
    // TODO Extend routing strategies with logging capabilities so that we can measure computational costs.

    publish(message: IMessage): void;
    subscribe(subscription: ISubscription, retrieveOldMessages?: boolean): void;
    unsubscribe(id: string): void;
    join(domain: IAddress): void;
}

export = IRoutingStrategy;