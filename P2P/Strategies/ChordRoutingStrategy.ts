import IAddress = require("../Interfaces/IAddress");
import IBroker = require("../../P2P.Broker/Interfaces/IBroker");
import IMessage = require("../Interfaces/IMessage");
import IRoutingStrategy = require("../Interfaces/IRoutingStrategy");
import ISubscription = require("../Interfaces/ISubscription");
import MessageType = require("../../P2P.Broker/Enumerations/MessageType");
import ArrayUtilities = require("../Utilities/ArrayUtilities");

class ChordRoutingStrategy implements IRoutingStrategy
{
    private recentMessages: any = { };
    private _subscribers: Array<ISubscription> = [ ];

    constructor(private broker: IBroker)
    {
        this.broker.receive((messageType: MessageType, data: any) =>
        {
            switch (messageType)
            {
                case MessageType.Message:

                    break;

                case MessageType.Subscription:
                    var subscription = <ISubscription>data;
                    this._subscribers.push(subscription);
                    break;

                case MessageType.Unsubscription:
                    this._subscribers = this._subscribers.filter(value => value.id !== data);
                    break;

                case MessageType.Subscribers:
                    var filteredSubscribers = this._subscribers.filter(value => ArrayUtilities.intersection(value.tags, <Array<string>>data.tags).length > 0 && value.filter(data));
                    this.broker.send(MessageType.FilteredSubscribers, filteredSubscribers);
                    break;
            }
        });
    }

    public get subscribers(): Array<ISubscription>
    {
        return this._subscribers;
    }

    public publish(message: IMessage): void
    {
        this.broker.send(MessageType.Publish, message);
    }

    public subscribe(subscription: ISubscription): void
    {
        this.broker.send(MessageType.Subscribe, subscription);
        this.broker.receive((messageType: MessageType, message: IMessage) =>
        {
            if (messageType === MessageType.Message)
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