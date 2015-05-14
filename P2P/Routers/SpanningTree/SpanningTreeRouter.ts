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
                    data.tag = "weather"; // TODO Remove this.

                    if (!this.nodes[data.tag])
                        this.nodes[data.tag] = new SpanningTreeNode(this.address /*, data.tag*/);

                    deferred.resolve(this.nodes[data.tag]);
                    return deferred.promise;

                case SpanningTreeMessages.SetLeft:
                    data.tag = "weather"; // TODO Remove this.

                    this.nodes[data.tag].left = Address.deserialise(data.address);
                    break;

                case SpanningTreeMessages.SetRight:
                    data.tag = "weather"; // TODO Remove this.

                    this.nodes[data.tag].right = Address.deserialise(data.address);
                    break;

                case SpanningTreeMessages.SetParent:
                    data.tag = "weather"; // TODO Remove this.

                    this.nodes[data.tag].parent = Address.deserialise(data.address);
                    break;

                case SpanningTreeMessages.Message:
                    var left = this.nodes[data.tag].left;
                    var right = this.nodes[data.tag].right;

                    if (left) this.sendMessage(left, data.message, data.tag);
                    if (right) this.sendMessage(right, data.message, data.tag);

                    this.readMessage(data.message);
                    break;

                case RouterMessages.Heartbeat:
                    this.repair();
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
            return this.lookup(tag).then(responsiblePeer => this.sendMessage(responsiblePeer, message, tag));
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
                this.insert(root, tag)
                    .then(node => this.nodes[tag] = node)
                    .catch(() => deferred.reject("Failed to subscribe to " + subscription.id));
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
                var otherSubscriptions = ArrayUtilities.except(this.localSubscriptions, [ subscription ]);

                if (!ArrayUtilities.contains(ArrayUtilities.flatten(otherSubscriptions.map(s => s.tags)), tag))
                {
                    this.delete(tag).then(() =>
                    {
                        if ((this.nodes[tag]).parent) this.nodes[tag] = null;
                    });
                }

                return Helpers.resolvedUnit();
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

        this.broker.send(this.address, HttpMethod.Post, RouterMessages.Join, domain)
            .then(() => deferred.resolve(true))
            .catch(() => deferred.reject("Failed to join the network"));



        return deferred.promise;
    }

    private repair()
    {
        for (var t in this.nodes)
        {
            if (this.nodes.hasOwnProperty(t))
            {
                ((tag: string) =>
                {
                    if ((<SpanningTreeNode>this.nodes[tag]).parent)
                    {
                        this.ping(<Address>(this.nodes[tag].parent)).then(() => { }).catch(() =>
                        {
                            var left = this.nodes[tag].left;
                            var right = this.nodes[tag].right;
                            this.nodes[tag] = null;

                            console.log("PARENT HAS FAILED");

                            this.lookup(tag).then(root => this.insert(root, tag).then(node =>
                            {
                                node.left = left;
                                node.right = right;

                                console.log("FIXED " + JSON.stringify(root));

                                this.nodes[tag] = node;
                            }));
                        });
                    }

                    if ((<SpanningTreeNode>this.nodes[tag]).left)
                        this.ping(<Address>(this.nodes[tag].left)).then(() => { }).catch(() => this.nodes[tag].left = null);

                    if ((<SpanningTreeNode>this.nodes[tag]).right)
                        this.ping(<Address>(this.nodes[tag].right)).then(() => { }).catch(() => this.nodes[tag].right = null);
                })(t);
            }
        }
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

    // HELPERS: Broker
    private lookup(tag: string): Promise<Address>
    {
        return this.broker.send(this.address, HttpMethod.Get, RouterMessages.Lookup, tag)
            .then((a: any) => Address.deserialise(a));
    }

    private sendMessage(subscriber: Address, message: Message, tag: string): Promise<void>
    {
        return this.broker.send(subscriber, HttpMethod.Post, SpanningTreeMessages.Message, { message: message, tag: tag })
            .then(() => console.log("SENT TO " + subscriber.toString()))
            .catch(() => console.log("FAILED TO SEND TO " + subscriber.toString()));
    }

    private insert(root: Address, tag: string): Promise<SpanningTreeNode>
    {
        var deferred = Q.defer<SpanningTreeNode>();

        console.log("ROOT IS " + JSON.stringify(root));

        this.getNode(root, tag).then(n =>
        {
            var alreadyInTree = false;
            var x = n;
            //            console.log("SET X TO " + JSON.stringify(x));
            var y: SpanningTreeNode = null;

            var z = new SpanningTreeNode(this.address /*, tag*/);
            //            z.subscription = subscription;

            this.promiseWhile(() => !!x, () =>
            {
                if (this.address.equals(x.address) || this.address.equals(x.left)
                    || this.address.equals(x.right) || this.address.equals(x.parent))
                {
                    alreadyInTree = true;
                    return Helpers.resolvedUnit().then(() => x = null);
                }

                //                console.log("Y IS " + JSON.stringify(y));
                y = x;
                //                console.log("SET Y TO " + JSON.stringify(y));

                if (z.key < x.key)
                {
                    if (x.left)
                        return this.getNode(x.left, tag).then(left =>
                        {
                            x = left;
                            //                            console.log("LEFT SET X TO " + JSON.stringify(x));
                        });
                    else
                        return Helpers.resolvedUnit().then(() => x = null);
                }
                else
                {
                    if (x.right)
                        return this.getNode(x.right, tag).then(right =>
                        {
                            x = right;
                            //                            console.log("RIGHT SET X TO " + JSON.stringify(x));
                        });
                    else
                        return Helpers.resolvedUnit().then(() => x = null);
                }
                //
            }).then(() =>
            {
                if (!alreadyInTree)
                {
//                    console.log("INSERT: " + JSON.stringify(y));

                    z.parent = y.address;

                    //                console.log("INSERT: " + JSON.stringify(y.address));

                    if (z.key < y.key)
                        this.setLeft(y.address, tag, z.address);
                    else
                        this.setRight(y.address, tag, z.address);

                    deferred.resolve(z);
                }
                else
                    deferred.resolve(this.nodes[tag]);
            });
        }).catch(() => deferred.reject((void 0)));

        return deferred.promise;
    }

    private minimum(x: SpanningTreeNode, tag: string): Promise<SpanningTreeNode>
    {
        return this.promiseWhile(() => !!x.left, () =>
        {
            return this.getNode(x.left, tag).then(left => x = left);
        }).then(() => x);
    }

    private transplant(u: SpanningTreeNode, v: Address, tag: string): Promise<void>
    {
        return this.getNode(u.parent, tag).then<void>(parent =>
        {
            if (u.address.equals(parent.left)) this.setLeft(u.parent, tag, v);
            else this.setRight(u.parent, tag, v);

            if (v) this.setParent(v, tag, u.parent);
            return Helpers.resolvedUnit();
        });
    }

    private "delete"(tag: string): Promise<void>
    {
        var self = this;
        var z = <SpanningTreeNode>this.nodes[tag];

        if (!z.parent)
            return Helpers.resolvedUnit();
        else
        {
            if (!z.left)
                return this.transplant(z, z.right, tag);
            else if (!z.right)
                return this.transplant(z, z.left, tag);
            else
            {
                return this.getNode(z.right, tag).then(right =>
                {
                    this.minimum(right, tag).then(y =>
                    {
                        function transplantRight(): Promise<void>
                        {
                            if (!z.address.equals(y.parent))
                            {
                                return self.transplant(y, y.right, tag)
                                    .then<void>(() => self.setRight(y.address, tag, z.right))
                                    .then<void>(() => self.setParent(z.right, tag, y.address));
                            }
                            else
                                return Helpers.resolvedUnit();
                        }

                        transplantRight().then(() =>
                        {
                            this.transplant(z, y.address, tag)
                                .then(() => this.setLeft(y.address, tag, z.left))
                                .then(() => this.setParent(y.left, tag, y.address));
                        });
                    });
                });
            }
        }
    }

    private getNode(peer: Address, tag: string): Promise<SpanningTreeNode>
    {
        return this.broker.send(peer, HttpMethod.Get, SpanningTreeMessages.GetNode, { tag: tag }).then(n => SpanningTreeNode.deserialise(n));
    }

    private setLeft(peer: Address, tag: string, left: Address): Promise<void>
    {
        return this.broker.send(peer, HttpMethod.Put, SpanningTreeMessages.SetLeft, { tag: tag, address: left });
    }

    private setRight(peer: Address, tag: string, right: Address): Promise<void>
    {
        //        console.log("SETTING RIGHT OF " + JSON.stringify(peer.toString()));
        return this.broker.send(peer, HttpMethod.Put, SpanningTreeMessages.SetRight, { tag: tag, address: right });
    }

    private setParent(peer: Address, tag: string, parent: Address): Promise<void>
    {
        return this.broker.send(peer, HttpMethod.Put, SpanningTreeMessages.SetParent, { tag: tag, address: parent });
    }

    private ping(subscriber: Address)
    {
        return this.broker.send(subscriber, HttpMethod.Get, RouterMessages.Ping, "");
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