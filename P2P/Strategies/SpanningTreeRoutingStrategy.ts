import IAddress = require("../Interfaces/IAddress");
import IBroker = require("../../P2P.Broker/Interfaces/IBroker");
import IMessage = require("../Interfaces/IMessage");
import IRoutingStrategy = require("../Interfaces/IRoutingStrategy");
import ISubscription = require("../Interfaces/ISubscription");
import ArrayUtilities = require("../Utilities/ArrayUtilities");

class SpanningTreeRoutingStrategy implements IRoutingStrategy
{
    public publish(message: IMessage): void { }

    public subscribe(subscription: ISubscription): void { }

    public unsubscribe(id: string): void { }

    public join(domain: IAddress): void { }
}