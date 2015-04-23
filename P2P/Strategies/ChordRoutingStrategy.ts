import Guid = require("../Core/Guid");
import IAddress = require("../Interfaces/IAddress");
import IBroker = require("../../P2P.Broker/Interfaces/IBroker");
import IMessage = require("../Interfaces/IMessage");
import IRoutingStrategy = require("../Interfaces/IRoutingStrategy");
import ISubscription = require("../Interfaces/ISubscription");
import MessageType = require("../../P2P.Broker/Enumerations/MessageType");

class ChordRoutingStrategy implements IRoutingStrategy
{
    private recentMessages: any = { };

    constructor(private broker: IBroker)
    {
    }

    public publish<TContents>(message: IMessage<TContents>): void
    {
        this.broker.send(MessageType.Publish, message);
    }

    public subscribe<TContents>(subscription: ISubscription<TContents>): void
    {
        this.broker.send(MessageType.Subscribe, subscription);
        this.broker.receive((m: MessageType, d: IMessage<TContents>) =>
        {
            if (m === MessageType.Incoming)
            {
                if (!this.recentMessages.hasOwnProperty(d.id.id))
                    this.recentMessages[d.id.id] = <Array<string>>[ ];

                if (!this.isInArray(this.recentMessages[d.id.id], subscription.id.id))
                {
                    subscription.callback(d);
                    this.recentMessages[d.id.id].push(subscription.id.id);
                }
            }
        });
    }

    public unsubscribe(id: Guid): void { }

    public join(domain: IAddress): void
    {
        this.broker.send(MessageType.Join, domain);
    }

    private isInArray<T>(array: Array<T>, element: T): boolean
    {
        return array.indexOf(element) >= 0;
    }
}

export = ChordRoutingStrategy;