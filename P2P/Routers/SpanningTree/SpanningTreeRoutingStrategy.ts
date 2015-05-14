import Q = require("q");
import Promise = Q.Promise;

import IRouter = require("../IRouter");

import Address = require("../../Common/Address");
import Message = require("../../Common/Message");
import Subscription = require("../../Common/Subscription");

class SpanningTreeRouter implements IRouter
{
    public publish(message: Message): Promise<boolean>
    {
        throw new Error("Not implemented");
    }

    public subscribe(subscription: Subscription, retrieveOldMessages?: boolean): Promise<boolean>
    {
        throw new Error("Not implemented");
    }

    public unsubscribe(id: string): Promise<boolean>
    {
        throw new Error("Not implemented");
    }

    public join(domain: Address): Promise<boolean>
    {
        throw new Error("Not implemented");
    }
}