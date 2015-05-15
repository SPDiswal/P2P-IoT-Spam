import Q = require("q");
import Promise = Q.Promise;

import IBroker = require("../../Brokers/IBroker");
import IFilterEvaluator = require("../../Filters/IFilterEvaluator");
import IRouter = require("../IRouter");

import Address = require("../../Common/Address");
import ArrayUtilities = require("../../Utilities/ArrayUtilities");
import Message = require("../../Common/Message");
import Responsibility = require("../../Common/Responsibility");
import RouterMessages = require("../RouterMessages");
import SubscriberListMessages = require("./SubscriberListMessages");
import Subscription = require("../../Common/Subscription");

class SubscriberListRouter implements IRouter
{
    private recentMessages: any = { };
    private localSubscriptions: Array<Subscription> = [ ];

    // TODO Ensure (in heartbeat) that all local subscriptions are registered properly at the responsible peers.

    constructor(private address: Address, private broker: IBroker, private filterEvaluator: IFilterEvaluator)
    {
        this.broker.incoming((message: string, data: any): Promise<any> =>
        {
            var deferred = Q.defer<any>();

            switch (message)
            {
                case RouterMessages.MergeResponsibilities:
                    var first = <Responsibility>data.first;
                    var second = <Responsibility>data.second;

                    var firstSubscribers = <Array<Subscription>>first.data.map((s: any) => Subscription.deserialise(s));
                    var secondSubscribers = <Array<Subscription>>second.data.map((s: any) => Subscription.deserialise(s));

                    deferred.resolve(new Responsibility(second.identifier, ArrayUtilities.union(firstSubscribers, secondSubscribers)));
                    return deferred.promise;

                case RouterMessages.Heartbeat:
                    this.cleanUpFailedPeers();

                    // TODO Clean up database with deleteData.

                    break;

                case SubscriberListMessages.GetSubscriberList:
                    deferred.resolve(this.getFilteredSubscriberList(Message.deserialise(data)));
                    return deferred.promise;

                case SubscriberListMessages.Message:
                    this.readMessage(Message.deserialise(data));
                    break;

                case SubscriberListMessages.MultipleMessages:
                    // TODO Read each message.
                    break;

                case SubscriberListMessages.AddSubscription:
                    this.addToSubscriberList(Subscription.deserialise(data));
                    break;

                case SubscriberListMessages.RemoveSubscription:
                    this.removeFromSubscriberList(Subscription.deserialise(data));
                    break;

                case SubscriberListMessages.PublishAgainExclusively:
                    // TODO Call getData/:tag, construct array of messages, send MultipleMessages.
                    break;
            }

            deferred.resolve((void 0));
            return deferred.promise;
        });
    }

    public publish(message: Message): Promise<boolean>
    {
        var deferred = Q.defer<boolean>();

        Q.all<Array<Subscription>>(message.tags.map(tag =>
        {
            // Looks up the responsible peers of each message tag and gets their subscriber lists.
            return this.lookup(tag)
                .then<Array<Subscription>>(responsiblePeer => this.getSubscriberList(responsiblePeer, message));
            //
        })).then(s =>
        {
            var subscribers = ArrayUtilities.distinct(ArrayUtilities.flatten(s));

            // Sends the message to each subscriber.
            Q.allSettled(subscribers.map(subscriber => this.sendMessage(subscriber.address, message)))
                .then(() => deferred.resolve(true));

            this.persist(this.address, message);
            //
        }).catch(() => deferred.reject("Failed to publish message " + message.id));

        return deferred.promise;
    }

    public subscribe(subscription: Subscription, retrieveOldMessages = false): Promise<boolean>
    {
        var deferred = Q.defer<boolean>();

        Q.all(subscription.tags.map(tag =>
        {
            // Looks up the responsible peers of each subscription tag.
            return this.lookup(tag)
                .then(responsiblePeer =>
                {
                    // Adds this subscription to the subscriber lists of the responsible peers.
                    return this.addSubscription(responsiblePeer, subscription).then(() =>
                    {
                        // Requests responsible peers to publish all previous messages again to this peer exclusively.
                        if (retrieveOldMessages) this.publishAgainExclusively(responsiblePeer, subscription);
                    });
                });
        })).then(() =>
        {
            this.localSubscriptions = this.localSubscriptions.filter(s => s.id !== subscription.id).concat([ subscription ]);
            deferred.resolve(true);
        }).catch(() => deferred.reject("Failed to subscribe to " + subscription.id));

        return deferred.promise;
    }

    public unsubscribe(id: string): Promise<boolean>
    {
        var deferred = Q.defer<boolean>();
        var subscription = ArrayUtilities.find(this.localSubscriptions, s => s.id === id);

        if (subscription)
        {
            Q.all(subscription.tags.map(tag =>
            {
                // Looks up the responsible peers of each subscription tag
                // and removes this subscription from the subscriber lists of the responsible peers.
                return this.lookup(tag)
                    .then(responsiblePeer => this.removeSubscription(responsiblePeer, subscription));
                //
            })).then(() =>
            {
                this.localSubscriptions = this.localSubscriptions.filter(s => s.id !== subscription.id);
                deferred.resolve(true);
            }).catch(() => deferred.reject("Failed to unsubscribe from " + id));
        }
        else
            deferred.reject("No subscription with id " + id);

        return deferred.promise;
    }

    public join(domain: Address): Promise<boolean>
    {
        var deferred = Q.defer<boolean>();

        this.broker.send(this.address, RouterMessages.Join, domain)
            .then(() => deferred.resolve(true))
            .catch(() => deferred.reject("Failed to join the network"));

        return deferred.promise;
    }

    // HELPERS: Incoming messages
    private getFilteredSubscriberList(message: Message): Promise<Array<Subscription>>
    {
        var deferred = Q.defer<Array<Subscription>>();

        Q.all<Responsibility>(message.tags.map(tag => this.getResponsibility(this.address, tag))).then(r =>
        {
            var subscribers = ArrayUtilities.distinct(ArrayUtilities.flatten(r.map(t => <Array<Subscription>>t.data)));
            deferred.resolve(subscribers.filter(s => this.filter(s, message)));
        }).catch(() => deferred.resolve([ ]));

        return deferred.promise;
    }

    private filter(subscription: Subscription, message: Message)
    {
        return !ArrayUtilities.disjoint(subscription.tags, message.tags)
            && this.filterEvaluator.evaluate(subscription.filter, message);
    }

    private readMessage(message: Message)
    {
        this.localSubscriptions.filter(s => !ArrayUtilities.disjoint(s.tags, message.tags)
            && this.filterEvaluator.evaluate(s.filter, message)).forEach(s =>
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
        subscription.tags.forEach(tag => this.putResponsibility(this.address, new Responsibility(tag, [ subscription ])));
    }

    private removeFromSubscriberList(subscription: Subscription)
    {
        this.getAllResponsibilities(this.address).then(responsibilities => responsibilities.forEach(r =>
        {
            this.postResponsibility(this.address, new Responsibility(r.identifier, r.data.filter((s: any) => s.id !== subscription.id)));
        }));
    }

    private cleanUpFailedPeers()
    {
        this.getAllResponsibilities(this.address).then(r =>
        {
            var allSubscriptions = ArrayUtilities.distinct(<Array<Subscription>>ArrayUtilities.flatten(r.map(t => t.data)));
            var remoteSubscriptions = ArrayUtilities.except(allSubscriptions, this.localSubscriptions);

            if (remoteSubscriptions.length > 0)
            {
                // Pings each subscriber.
                Q.allSettled(allSubscriptions.map(subscriber =>
                {
                    return this.ping(subscriber.address).then(() => subscriber);
                    //
                })).then(results =>
                {
                    // Removes subscriptions from failed peers.
                    var liveSubscriptions = results.filter(q => q.state === "fulfilled").map(q => <Subscription>q.value);
                    var failedSubscriptions = ArrayUtilities.except(allSubscriptions, liveSubscriptions);

                    console.log(failedSubscriptions);

                    failedSubscriptions.forEach(deadSubscription => this.removeSubscription(this.address, deadSubscription));
                });
            }
        });
    }

    // HELPERS: Broker
    private lookup(tag: string): Promise<Address>
    {
        return this.broker.send(this.address, RouterMessages.Lookup, tag)
            .then((a: any) => Address.deserialise(a));
    }

    private getSubscriberList(responsiblePeer: Address, message: Message): Promise<Array<Subscription>>
    {
        return this.broker.send(responsiblePeer, SubscriberListMessages.GetSubscriberList, message)
            .then((r: any) => r.map((s: any) => Subscription.deserialise(s)));
    }

    private sendMessage(subscriber: Address, message: Message)
    {
        return this.broker.send(subscriber, SubscriberListMessages.Message, message);
    }

    private addSubscription(responsiblePeer: Address, subscription: Subscription)
    {
        return this.broker.send(responsiblePeer, SubscriberListMessages.AddSubscription, subscription);
    }

    private removeSubscription(responsiblePeer: Address, subscription: Subscription)
    {
        return this.broker.send(responsiblePeer, SubscriberListMessages.RemoveSubscription, subscription);
    }

    private publishAgainExclusively(responsiblePeer: Address, subscription: Subscription)
    {
        return this.broker.send(responsiblePeer, SubscriberListMessages.PublishAgainExclusively, subscription);
    }

    private ping(subscriber: Address)
    {
        return this.broker.send(subscriber, RouterMessages.Ping, "");
    }

    private getResponsibility(responsiblePeer: Address, tag: string): Promise<Responsibility>
    {
        return this.broker.send(responsiblePeer, RouterMessages.GetResponsibility, tag)
            .then((r: any) => new Responsibility(r.identifier, r.data.map((s: any) => Subscription.deserialise(s))));
    }

    private getAllResponsibilities(responsiblePeer: Address): Promise<Array<Responsibility>>
    {
        return this.broker.send(responsiblePeer, RouterMessages.GetAllResponsibilities, null)
            .then((r: any) => r.map((t: any) => new Responsibility(t.identifier, t.data.map((s: any) => Subscription.deserialise(s)))));
    }

    private postResponsibility(responsiblePeer: Address, responsibility: Responsibility): Promise<void>
    {
        return this.broker.send(responsiblePeer, RouterMessages.PostResponsibility, responsibility);
    }

    private putResponsibility(responsiblePeer: Address, responsibility: Responsibility): Promise<void>
    {
        return this.broker.send(responsiblePeer, RouterMessages.PutResponsibility, responsibility);
    }

    private deleteResponsibility(responsiblePeer: Address, tag: string): Promise<void>
    {
        return this.broker.send(responsiblePeer, RouterMessages.DeleteResponsibility, tag);
    }

    private retrieve(responsiblePeer: Address, tag: string): Promise<Array<Message>>
    {
        return this.broker.send(responsiblePeer, RouterMessages.Retrieve, tag);
    }

    private retrieveSince(responsiblePeer: Address, tag: string, timestamp: Date): Promise<Array<Message>>
    {
        return this.broker.send(responsiblePeer, RouterMessages.Retrieve, { identifier: tag, timestamp: timestamp });
    }

    private persist(responsiblePeer: Address, message: Message): Promise<void>
    {
        return this.broker.send(responsiblePeer, RouterMessages.Persist, message);
    }

    private sweep(responsiblePeer: Address, timestamp: Date): Promise<void>
    {
        return this.broker.send(responsiblePeer, RouterMessages.Sweep, timestamp);
    }
}

export = SubscriberListRouter;