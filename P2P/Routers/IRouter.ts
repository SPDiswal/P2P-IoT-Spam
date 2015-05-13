import Message = require("../Common/Message");
import Subscription = require("../Common/Subscription");
import Address = require("../Common/Address");

interface IRouter
{
    // TODO Extend routers with logging capabilities so that we can measure computational costs.

    publish(message: Message): void;
    subscribe(subscription: Subscription, retrieveOldMessages?: boolean): void;
    unsubscribe(id: string): void;
    join(domain: Address): void;
}

export = IRouter;