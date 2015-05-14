import Q = require("q");
import Promise = Q.Promise;

import Address = require("../Common/Address");
import Message = require("../Common/Message");
import Subscription = require("../Common/Subscription");

interface IRouter
{
    // TODO Extend routers with logging capabilities so that we can measure computational costs.

    publish(message: Message): Promise<boolean>;
    subscribe(subscription: Subscription, retrieveOldMessages?: boolean): Promise<boolean>;
    unsubscribe(id: string): Promise<boolean>;
    join(domain: Address): Promise<boolean>;
}

export = IRouter;