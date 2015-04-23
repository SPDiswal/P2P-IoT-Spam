import Guid = require("../Utilities/Guid");
import IAddress = require("../Interfaces/IAddress");
import IBroker = require("../../P2P.Broker/Interfaces/IBroker");
import IMessage = require("../Interfaces/IMessage");
import IRoutingStrategy = require("../Interfaces/IRoutingStrategy");
import ISubscription = require("../Interfaces/ISubscription");
import MessageType = require("../../P2P.Broker/Enumerations/MessageType");

class ChordRoutingStrategy implements IRoutingStrategy
{
    constructor(private broker: IBroker)
    {
    }

    public publish<TContents>(message: IMessage<TContents>): void { }

    public subscribe<TContents>(subscription: ISubscription<TContents>): Guid { return null; }

    public unsubscribe(id: Guid): void { }

    public join(domain: IAddress): void
    {
        this.broker.send(MessageType.Join, domain);
    }
}

export = ChordRoutingStrategy;