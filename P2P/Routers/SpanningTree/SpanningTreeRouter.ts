import Q = require("q");
import Promise = Q.Promise;

import IBroker = require("../../Brokers/IBroker");
import IFilterEvaluator = require("../../Filters/IFilterEvaluator");
import IRouter = require("../IRouter");

import Address = require("../../Common/Address");
import HttpMethod = require("../../Http/HttpMethod");
import Message = require("../../Common/Message");
import Responsibility = require("../../Common/Responsibility");
import RouterMessages = require("../RouterMessages");
import Subscription = require("../../Common/Subscription");
import SpanningTreeMessages = require("./SpanningTreeMessages");
import SpanningTreeNode = require("./SpanningTreeNode");
import Helpers = require("../../Utilities/Helpers");

class SpanningTreeRouter implements IRouter
{
    private recentMessages: any = { };
    private localSubscriptions: Array<Subscription> = [ ];
    private nodes: any = { };

    constructor(private address: Address, private broker: IBroker, private filterEvaluator: IFilterEvaluator)
    {
        this.broker.incoming((message: string, data: any): Promise<any> =>
        {
            var deferred = Q.defer<any>();

            switch (message)
            {
                case SpanningTreeMessages.GetNode:
                    if (!this.nodes[data.tag])
                        this.nodes[data.tag] = new SpanningTreeNode(this.address/*, data.tag*/);

                    console.log("GETNODE: " + JSON.stringify(this.nodes[data.tag]));

                    deferred.resolve(this.nodes[data.tag]);                    
                    return deferred.promise;

                case SpanningTreeMessages.SetLeft:
                    this.nodes[data.tag].left = data.address;
                    console.log("SETLEFT: " + JSON.stringify(this.nodes[data.tag]));
                    break;

                case SpanningTreeMessages.SetRight:
                    this.nodes[data.tag].right = data.address;
                    console.log("SETRIGHT: " + JSON.stringify(this.nodes[data.tag]));
                    break;

                case SpanningTreeMessages.SetParent:
                    this.nodes[data.tag].parent = data.address;
                    console.log("SETPARENT: " + JSON.stringify(this.nodes[data.tag]));
                    break;

                case SpanningTreeMessages.Message:
                    // TODO
                    break;
            }

            deferred.resolve((void 0));
            return deferred.promise;
        });
    }

    public publish(message: Message): Promise<boolean>
    {
        var deferred = Q.defer<boolean>();

        Q.allSettled(message.tags.map(tag =>
        {
            // Looks up the responsible peers of each message tag and sends the message to them.
            return this.lookup(tag).then(responsiblePeer => this.sendMessage(responsiblePeer, message));
            //
        })).catch(() => deferred.reject("Failed to publish message " + message.id));

        return deferred.promise;
    }

    public subscribe(subscription: Subscription, retrieveOldMessages?: boolean): Promise<boolean>
    {
        var deferred = Q.defer<boolean>();

        Q.all(subscription.tags.map(tag =>
        {
            // Looks up the responsible peers of each subscription tag.
            return this.lookup(tag).then(root =>
            {
                this.insert(root, subscription, tag).then(node =>
                {
                    this.nodes[tag] = node;
                    console.log("SUBSCRIBED! " + JSON.stringify(node));
                    console.log("SUBSCRIBED! " + JSON.stringify(this.nodes[tag]));
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
        throw new Error("Not implemented");
    }

    public join(domain: Address): Promise<boolean>
    {
        var deferred = Q.defer<boolean>();

        this.broker.send(this.address, HttpMethod.Post, RouterMessages.Join, domain)
            .then(() => deferred.resolve(true))
            .catch(() => deferred.reject("Failed to join the network"));

        return deferred.promise;
    }

    // HELPERS: Broker
    private lookup(tag: string): Promise<Address>
    {
        return this.broker.send(this.address, HttpMethod.Get, RouterMessages.Lookup, tag)
            .then((a: any) => Address.deserialise(a));
    }

    private sendMessage(subscriber: Address, message: Message): Promise<void>
    {
        return this.broker.send(subscriber, HttpMethod.Post, SpanningTreeMessages.Message, message);
    }

    private insert(root: Address, subscription: Subscription, tag: string): Promise<SpanningTreeNode>
    {
        var deferred = Q.defer<SpanningTreeNode>();

        this.getNode(root, tag).then(n =>
        {
            var x = n;
            var y: SpanningTreeNode = null;

            var z = new SpanningTreeNode(subscription.address/*, tag*/);
            z.subscription = subscription;

            this.promiseWhile(() => x !== null, () =>
            {
                y = x;

                if (z.key < x.key)
                {
                    if (x.left)
                        return this.getNode(x.left, tag).then(left => x = left);
                    else
                        return Helpers.resolvedUnit().then(() => x = null);
                }
                else
                {
                    if (x.right)
                        return this.getNode(x.right, tag).then(right => x = right);
                    else
                        return Helpers.resolvedUnit().then(() => x = null);
                }
                //
            }).then(() =>
            {
                z.parent = y.address;

                console.log("INSERT: " + JSON.stringify(z));

                if (z.key < y.key)
                    this.setLeft(y.address, tag, z.address);
                else
                    this.setRight(y.address, tag, z.address);

                deferred.resolve(z);
            });
        }).catch(() => deferred.reject((void 0)));

        return deferred.promise;
    }

    private getNode(peer: Address, tag: string): Promise<SpanningTreeNode>
    {
        return this.broker.send(peer, HttpMethod.Get, SpanningTreeMessages.GetNode, { tag: tag });
    }

    private setLeft(peer: Address, tag: string, left: Address): Promise<void>
    {
        return this.broker.send(peer, HttpMethod.Put, SpanningTreeMessages.SetLeft, { tag: tag, address: left });
    }

    private setRight(peer: Address, tag: string, right: Address): Promise<void>
    {
        return this.broker.send(peer, HttpMethod.Put, SpanningTreeMessages.SetRight, { tag: tag, address: right });
    }

    private setParent(peer: Address, tag: string, parent: Address): Promise<void>
    {
        return this.broker.send(peer, HttpMethod.Put, SpanningTreeMessages.SetParent, { tag: tag, address: parent });
    }

    // Borrowed from http://stackoverflow.com/a/17238793
    private promiseWhile(condition: () => boolean, body: () => any): Promise<void>
    {
        var deferred = Q.defer<void>();

        function loop()
        {
            if (!condition()) deferred.resolve((void 0));
            else Q.when(body(), loop, deferred.reject);
        }

        Q.nextTick(loop);
        return deferred.promise;
    }
}

export = SpanningTreeRouter;