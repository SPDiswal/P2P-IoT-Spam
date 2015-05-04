import IAddress = require("../Interfaces/IAddress");
import IBroker = require("../../P2P.Broker/Interfaces/IBroker");
import IMessage = require("../Interfaces/IMessage");
import IRoutingStrategy = require("../Interfaces/IRoutingStrategy");
import ISubscription = require("../Interfaces/ISubscription");
import ArrayUtilities = require("../Utilities/ArrayUtilities");
import Address = require("../Core/Address");

class SubscriberListRoutingStrategy implements IRoutingStrategy
{
    private recentMessages: any = { };
    private _subscriberList: Array<ISubscription> = [ ];
    private _localSubscriptions: Array<ISubscription> = [ ];

    constructor(private address: IAddress, private broker: IBroker)
    {
        this.broker.handleToStrategy((message: string, messageData: any): any =>
        {
            switch (message)
            {
                case "Message":
                    this._localSubscriptions.forEach((subscription: ISubscription) =>
                    {
                        if (!this.recentMessages.hasOwnProperty(messageData.id))
                            this.recentMessages[messageData.id] = <Array<string>>[ ];

                        if (!this.isInArray(this.recentMessages[messageData.id], subscription.id))
                        {
                            subscription.callback(messageData);
                            this.recentMessages[messageData.id].push(subscription.id);
                        }
                    });

                    break;

                case "Subscription":        // TODO Renamed to AddSubscription
                    var subscription = <ISubscription>messageData;
                    this._subscriberList.push(subscription);
                    break;

                case "Unsubscription":      // TODO Renamed to RemoveSubscription
                    this._subscriberList = this._subscriberList.filter(s => s.id !== messageData);
                    break;

                case "Subscribers":         // TODO Renamed to GetSubscriberList or something like that :)
                    var filteredSubscribers = this._subscriberList.filter(subscription => ArrayUtilities.intersection(subscription.tags, <Array<string>>messageData.tags).length > 0 && subscription.filter(messageData));
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
        var responsiblePeers: Array<IAddress> = [ ];
        var subscribers: Array<IAddress> = [ ];

        // Looks up all responsible peers of the message tags.
        message.tags.forEach((tag: string) =>
        {
            responsiblePeers.push(this.broker.sendFromStrategy(this.address, "Lookup", tag));
        });

        // Retrieves subscriber list from all responsible peers.
        responsiblePeers.forEach((peer: IAddress) =>
        {
            subscribers = subscribers.concat(this.broker.sendFromStrategy(peer, "GetSubscriberList", message));
        });

        subscribers = ArrayUtilities.distinct(subscribers);

        // Sends message to all subscribers.
        subscribers.forEach((subscriber: IAddress) =>
        {
            this.broker.sendFromStrategy(subscriber, "Message", message);
        });
    }

    public subscribe(subscription: ISubscription, retrieveOldMessages?: boolean): void
    {
        var responsiblePeers: Array<IAddress> = [ ];

        // Looks up all responsible peers of the subscription tags.
        subscription.tags.forEach((tag: string) =>
        {
            responsiblePeers.push(this.broker.sendFromStrategy(this.address, "Lookup", tag));
        });

        // Adds subscription to subscriber lists of all responsible peers.
        responsiblePeers.forEach((peer: IAddress) =>
        {
            this.broker.sendFromStrategy(peer, "AddSubscription", subscription);
        });

        // Retrieves all previously published messages from all responsible peers.
        if (retrieveOldMessages)
        {
            responsiblePeers.forEach((peer: IAddress) =>
            {
                this.broker.sendFromStrategy(peer, "RetrieveAllMessages", subscription);
            });
        }

        this._localSubscriptions.push(subscription);
    }

    public unsubscribe(id: string): void
    {
        var responsiblePeers: Array<IAddress> = [ ];
        var subscription = this._localSubscriptions.filter(s => s.id === id)[0];

        // Looks up all responsible peers of the subscription tags.
        subscription.tags.forEach((tag: string) =>
        {
            responsiblePeers.push(this.broker.sendFromStrategy(this.address, "Lookup", tag));
        });

        // Removes subscription from subscriber lists of all responsible peers.
        responsiblePeers.forEach((peer: IAddress) =>
        {
            this.broker.sendFromStrategy(peer, "RemoveSubscription", id);
        });

        this._localSubscriptions = this._localSubscriptions.filter(s => s.id !== id);
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