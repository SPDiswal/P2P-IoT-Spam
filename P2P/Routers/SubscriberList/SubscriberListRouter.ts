﻿import Q = require("q");
import Promise = Q.Promise;

import IBroker = require("../../Brokers/IBroker");
import IFilterEvaluator = require("../../Filters/IFilterEvaluator");
import IRouter = require("../IRouter");

import Address = require("../../Common/Address");
import ArrayUtilities = require("../../Utilities/ArrayUtilities");
import HttpMethod = require("../../Http/HttpMethod");
import Message = require("../../Common/Message");
import Responsibility = require("../../Common/Responsibility");
import RouterMessages = require("../RouterMessages");
import SubscriberListMessages = require("./SubscriberListMessages");
import Subscription = require("../../Common/Subscription");

class SubscriberListRouter implements IRouter
{
    private recentMessages: any = { };
    private localSubscriptions: Array<Subscription> = [ ];

    constructor(private address: Address, private broker: IBroker, private filterEvaluator: IFilterEvaluator)
    {
        this.broker.incoming((message: string, data: any): Promise<any> =>
        {
            var deferred = Q.defer<any>();

            console.log(message);

            switch (message)
            {
                case RouterMessages.MergeResponsibilities:
                    var first = <Responsibility>data.first;
                    var second = <Responsibility>data.second;

                    var firstSubscribers = <Array<Subscription>>first.data.map((s: any) => Subscription.deserialise(s));
                    var secondSubscribers = <Array<Subscription>>second.data.map((s: any) => Subscription.deserialise(s));

                    deferred.resolve(new Responsibility(second.identifier, ArrayUtilities.union(firstSubscribers, secondSubscribers)));
                    return deferred.promise;

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
                    this.removeFromSubscriberList(Subscription.deserialise(data));
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

            Q.allSettled(subscribers.map(subscriber =>
            {
                return this.sendMessage(subscriber.address, message).then(() => subscriber);
            })).then(results =>
            {
                var succeedingSubscribers = results.filter(r => r.state === "fulfilled").map(r => <Subscription>r.value);
                var failedSubscribers = ArrayUtilities.except(subscribers, succeedingSubscribers);

                message.tags.map(tag =>
                {
                    this.lookup(tag).then(responsiblePeer => failedSubscribers.forEach(deadSubscription =>
                    {
                        this.removeSubscription(responsiblePeer, deadSubscription);
                    }));
                });
            });
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

        console.log("UNSUBSCRIBE " + JSON.stringify(subscription));

        if (subscription)
        {
            Q.all(subscription.tags.map(tag =>
            {
                // Looks up the responsible peers of each subscription tag
                // and removes this subscription from the subscriber lists of the responsible peers.
                return this.lookup(tag)
                    .then(responsiblePeer => this.removeSubscription(responsiblePeer, subscription));
                //
            })).then(() => this.localSubscriptions = this.localSubscriptions.filter(s => s.id !== subscription.id));
        }
    }

    public join(domain: Address): void
    {
        this.broker.send(this.address, HttpMethod.Post, RouterMessages.Join, domain);
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
        subscription.tags.forEach(tag => this.putResponsibility(this.address, new Responsibility(tag, [ subscription ])));
    }

    private removeFromSubscriberList(subscription: Subscription)
    {
        this.getAllResponsibilities(this.address)
            .then(responsibilities => responsibilities.forEach(r =>
            {
                this.postResponsibility(this.address, new Responsibility(r.identifier, r.data.filter((s: any) => s.id !== subscription.id)));
            }));
    }

    // HELPERS: Broker
    private lookup(tag: string): Promise<Address>
    {
        return this.broker.send(this.address, HttpMethod.Get, RouterMessages.Lookup, tag)
            .then((a: any) => Address.deserialise(a));
    }

    private getSubscriberList(responsiblePeer: Address, message: Message): Promise<Array<Subscription>>
    {
        return this.broker.send(responsiblePeer, HttpMethod.Get, SubscriberListMessages.GetSubscriberList, message)
            .then((r: any) => r.map((s: any) => Subscription.deserialise(s)));
    }

    private sendMessage(subscriber: Address, message: Message)
    {
        return this.broker.send(subscriber, HttpMethod.Post, SubscriberListMessages.Message, message);
    }

    private addSubscription(responsiblePeer: Address, subscription: Subscription)
    {
        return this.broker.send(responsiblePeer, HttpMethod.Put, SubscriberListMessages.AddSubscription, subscription);
    }

    private removeSubscription(responsiblePeer: Address, subscription: Subscription)
    {
        return this.broker.send(responsiblePeer, HttpMethod.Delete, SubscriberListMessages.RemoveSubscription, subscription);
    }

    private publishAgainExclusively(responsiblePeer: Address, subscription: Subscription)
    {
        return this.broker.send(responsiblePeer, HttpMethod.Post, SubscriberListMessages.PublishAgainExclusively, subscription);
    }

    private getResponsibility(responsiblePeer: Address, tag: string): Promise<Responsibility>
    {
        return this.broker.send(responsiblePeer, HttpMethod.Get, RouterMessages.GetResponsibility, tag)
            .then((r: any) => new Responsibility(r.identifier, r.data.map((s: any) => Subscription.deserialise(s))));
    }

    private getAllResponsibilities(responsiblePeer: Address): Promise<Array<Responsibility>>
    {
        return this.broker.send(responsiblePeer, HttpMethod.Get, RouterMessages.GetAllResponsibilities, null)
            .then((r: any) => r.map((t: any) => new Responsibility(t.identifier, t.data.map((s: any) => Subscription.deserialise(s)))));
    }

    private postResponsibility(responsiblePeer: Address, responsibility: Responsibility): Promise<void>
    {
        return this.broker.send(responsiblePeer, HttpMethod.Put, RouterMessages.PostResponsibility, responsibility);
    }

    private putResponsibility(responsiblePeer: Address, responsibility: Responsibility): Promise<void>
    {
        return this.broker.send(responsiblePeer, HttpMethod.Put, RouterMessages.PutResponsibility, responsibility);
    }

    private deleteResponsibility(responsiblePeer: Address, tag: string): Promise<void>
    {
        return this.broker.send(responsiblePeer, HttpMethod.Delete, RouterMessages.DeleteResponsibility, tag);
    }
}

export = SubscriberListRouter;