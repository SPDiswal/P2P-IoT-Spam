import Q = require("q");
import Promise = Q.Promise;

import IBroker = require("../../Brokers/IBroker");
import IFilterEvaluator = require("../../Filters/IFilterEvaluator");
import IRouter = require("../IRouter");

import Address = require("../../Common/Address");
import ArrayUtilities = require("../../Utilities/ArrayUtilities");
import HttpMethod = require("../../Http/HttpMethod");
import Message = require("../../Common/Message");
import RouterMessages = require("../RouterMessages");
import SubscriberListMessages = require("./SubscriberListMessages");
import Subscription = require("../../Common/Subscription");

class SubscriberListRouter implements IRouter
{
    // TODO Replicate subscriber list.

    private recentMessages: any = { };
    private subscriberList: Array<Subscription> = [ ];
    private localSubscriptions: Array<Subscription> = [ ];

    constructor(private address: Address, private broker: IBroker, private filterEvaluator: IFilterEvaluator)
    {
        this.broker.incoming((message: string, data: any): Promise<any> =>
        {
            var deferred = Q.defer<any>();

            switch (message)
            {
                case SubscriberListMessages.GetSubscriberList:
                    deferred.resolve(this.getFilteredSubscriberList(Message.deserialise(data)));
                    return deferred.promise;

                case SubscriberListMessages.Message:
                    this.readMessage(Message.deserialise(data));
                    break;

                case SubscriberListMessages.MultipleMessages:
                    // TODO
                    break;

                case SubscriberListMessages.AddSubscription:
                    this.addToSubscriberList(Subscription.deserialise(data));
                    break;

                case SubscriberListMessages.RemoveSubscription:
                    this.removeFromSubscriberList(<string>data);
                    break;

                case SubscriberListMessages.PublishAgainExclusively:
                    // TODO
                    break;
            }

            deferred.resolve((void 0));
            return deferred.promise;
        });
    }

    public publish(message: Message): void
    {
        Q.all<Array<Subscription>>(message.tags.map(tag =>
        {
            // Looks up the responsible peers of each message tag and gets their subscriber lists.
            return this.lookup(tag)
                .then<Array<Subscription>>(responsiblePeer => this.getSubscriberList(responsiblePeer, message));
            //
        })).then(s =>
        {
            // Sends the message to each subscriber.
            var subscribers = ArrayUtilities.distinct(ArrayUtilities.flatten(s));
            subscribers.map(t => Subscription.deserialise(t)).forEach(t => this.sendMessage(t.address, message));
        });
    }

    public subscribe(subscription: Subscription, retrieveOldMessages = false): void
    {
        Q.all(subscription.tags.map(tag =>
        {
            // Looks up the responsible peers of each subscription tag.
            return this.lookup(tag)
                .then(responsiblePeer =>
                {
                    // Adds this subscription to the subscriber lists of the responsible peers.
                    this.addSubscription(responsiblePeer, subscription);

                    // Requests responsible peers to publish all previous messages again to this peer exclusively.
                    if (retrieveOldMessages) this.publishAgainExclusively(responsiblePeer, subscription);
                });
        })).then(() =>
        {
            this.localSubscriptions = this.localSubscriptions.filter(s => s.id !== subscription.id).concat([ subscription ]);
        });
    }

    public unsubscribe(id: string): void
    {
        var subscription = ArrayUtilities.find(this.localSubscriptions, s => s.id === id);

        if (subscription)
        {
            Q.all(subscription.tags.map(tag =>
            {
                // Looks up the responsible peers of each subscription tag
                // and removes this subscription from the subscriber lists of the responsible peers.
                return this.lookup(tag)
                    .then(responsiblePeer => this.removeSubscription(responsiblePeer, id));
                //
            })).then(() => this.localSubscriptions = this.localSubscriptions.filter(s => s.id !== subscription.id));
        }
    }

    public join(domain: Address): void
    {
        this.broker.send(this.address, HttpMethod.Post, RouterMessages.Join, domain);

        // TODO Ask for subscriber lists to be moved to new responsible peer.
    }

    // HELPERS: Incoming messages
    private getFilteredSubscriberList(message: Message): Array<Subscription>
    {
        return this.subscriberList.filter(s => this.filter(s, message));
    }

    private filter(subscription: Subscription, message: Message)
    {
        return !ArrayUtilities.disjoint(subscription.tags, message.tags)
            && this.filterEvaluator.evaluate(subscription.filter, message);
    }

    private readMessage(message: Message)
    {
        this.localSubscriptions.forEach(s =>
        {
            if (!this.recentMessages.hasOwnProperty(message.id))
                this.recentMessages[message.id] = <Array<string>>[ ];

            // TODO Clean up recent messages, e.g. by timestamps.

            if (!ArrayUtilities.contains(this.recentMessages[message.id], s.id))
            {
                s.callback(message);
                this.recentMessages[message.id].push(s.id);
            }
        });
    }

    private addToSubscriberList(subscription: Subscription)
    {
        this.subscriberList.push(subscription);
    }

    private removeFromSubscriberList(id: string)
    {
        this.subscriberList = this.subscriberList.filter(s => s.id !== id);
    }

    // HELPERS: Broker
    private lookup(tag: string): Promise<Address>
    {
        return this.broker.send(this.address, HttpMethod.Get, RouterMessages.Lookup, tag)
            .then((r: any) => Address.deserialise(r));
    }

    private getSubscriberList(responsiblePeer: Address, message: Message): Promise<Array<Subscription>>
    {
        return this.broker.send(responsiblePeer, HttpMethod.Get, SubscriberListMessages.GetSubscriberList, message)
            .then((r: any) => r.map((t: any) => Subscription.deserialise(t)));
    }

    private sendMessage(subscriber: Address, message: Message)
    {
        return this.broker.send(subscriber, HttpMethod.Post, SubscriberListMessages.Message, message);
    }

    private addSubscription(responsiblePeer: Address, subscription: Subscription)
    {
        return this.broker.send(responsiblePeer, HttpMethod.Put, SubscriberListMessages.AddSubscription, subscription);
    }

    private removeSubscription(responsiblePeer: Address, id: string)
    {
        return this.broker.send(responsiblePeer, HttpMethod.Delete, SubscriberListMessages.RemoveSubscription, id);
    }

    private publishAgainExclusively(responsiblePeer: Address, subscription: Subscription)
    {
        return this.broker.send(responsiblePeer, HttpMethod.Post, SubscriberListMessages.PublishAgainExclusively, subscription);
    }
}

export = SubscriberListRouter;