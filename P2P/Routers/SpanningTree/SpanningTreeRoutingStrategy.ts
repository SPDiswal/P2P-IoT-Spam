import IRouter = require("../IRouter");

import Address = require("../../Common/Address");
import Message = require("../../Common/Message");
import Subscription = require("../../Common/Subscription");

class SpanningTreeRoutingStrategy implements IRouter
{
    public publish(message: Message): void { }

    public subscribe(subscription: Subscription): void { }

    public unsubscribe(id: string): void { }

    public join(domain: Address): void { }
}