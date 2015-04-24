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
        this.broker.receive((messageType: MessageType, message: IMessage<TContents>) =>
        {
            if (messageType === MessageType.Incoming)
            {
                if (!this.recentMessages.hasOwnProperty(message.id))
                    this.recentMessages[message.id] = <Array<string>>[ ];

                if (!this.isInArray(this.recentMessages[message.id], subscription.id))
                {
                    subscription.callback(message);
                    this.recentMessages[message.id].push(subscription.id);
                }
            }
        });
    }

    public unsubscribe(id: string): void
    {
        this.broker.send(MessageType.Unsubscribe, id);
    }

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