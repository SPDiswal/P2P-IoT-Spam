import Guid = require("../Utilities/Guid");
import IMessage = require("./IMessage");
import ISubscription = require("./ISubscription");
import IAddress = require("./IAddress");

interface IRoutingStrategy
{
    publish<TContents>(message: IMessage<TContents>): void;
    subscribe<TContents>(subscription: ISubscription<TContents>): Guid;
    unsubscribe(id: Guid): void;
    join(domain: IAddress): void;

    // TODO: Virtual nodes/peers with e.g. lookup methods (that delegate to the broker via its .send() method).
}

export = IRoutingStrategy;