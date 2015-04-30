import IAddress = require("../Interfaces/IAddress");
import IBroker = require("../../P2P.Broker/Interfaces/IBroker");
import IMessage = require("../Interfaces/IMessage");
import IRoutingStrategy = require("../Interfaces/IRoutingStrategy");
import ISubscription = require("../Interfaces/ISubscription");
import ArrayUtilities = require("../Utilities/ArrayUtilities");

class SubscriberListRoutingStrategy implements IRoutingStrategy
{
    private recentMessages: any = { };
    private _subscriberList: Array<ISubscription> = [ ];
    private _localSubscriptions: Array<ISubscription> = [ ];

    constructor(private address: IAddress, private broker: IBroker)
    {
        this.broker.handleToStrategy((messageType: string, data: any): any =>
        {
            switch (messageType)
            {
                case "Message":
                    this._localSubscriptions.forEach((subscription: ISubscription) =>
                    {
                        if (!this.recentMessages.hasOwnProperty(data.id))
                            this.recentMessages[data.id] = <Array<string>>[ ];

                        if (!this.isInArray(this.recentMessages[data.id], subscription.id))
                        {
                            subscription.callback(data);
                            this.recentMessages[data.id].push(subscription.id);
                        }
                    });

                    break;

                case "Subscription":
                    var subscription = <ISubscription>data;
                    this._subscriberList.push(subscription);
                    break;

                case "Unsubscription":
                    this._subscriberList = this._subscriberList.filter(value => value.id !== data);
                    break;

                case "Subscribers":
                    var filteredSubscribers = this._subscriberList.filter(value => ArrayUtilities.intersection(value.tags, <Array<string>>data.tags).length > 0 && value.filter(data));
                    this.broker.sendFromStrategy(address, "FilteredSubscribers", filteredSubscribers);
                    break;
            }

            return <any>null;
        });
    }

    public get subscribers(): Array<ISubscription>
    {
        return this._subscriberList;
    }

    public publish(message: IMessage): void
    {
        this.broker.sendFromStrategy(this.address, "Publish", message);
    }

    public subscribe(subscription: ISubscription): void
    {
        this._localSubscriptions.push(subscription);
        this.broker.sendFromStrategy(this.address, "Subscribe", subscription);
    }

    public unsubscribe(id: string): void
    {
        // TODO: _localSubscriptions.remove(subscription) via .filter;

        this.broker.sendFromStrategy(this.address, "Unsubscribe", id);
    }

    public join(domain: IAddress): void
    {
        this.broker.sendFromStrategy(this.address, "Join", domain);
    }

    private isInArray<T>(array: Array<T>, element: T): boolean
    {
        return array.indexOf(element) >= 0;
    }
}

export = SubscriberListRoutingStrategy;