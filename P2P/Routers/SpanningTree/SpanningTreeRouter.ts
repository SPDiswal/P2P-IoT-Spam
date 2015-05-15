import Q = require("q");
import Promise = Q.Promise;

import IBroker = require("../../Brokers/IBroker");
import IFilterEvaluator = require("../../Filters/IFilterEvaluator");
import IRouter = require("../IRouter");

import Address = require("../../Common/Address");
import ArrayUtilities = require("../../Utilities/ArrayUtilities");
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

    // TODO Ensure (in heartbeat) that all local subscriptions are registered properly by nodes in spanning trees.

    constructor(private address: Address, private broker: IBroker, private filterEvaluator: IFilterEvaluator)
    {
        this.broker.incoming((message: string, data: any): Promise<any> =>
        {
            var deferred = Q.defer<any>();

            switch (message)
            {
                case SpanningTreeMessages.GetNode:
                    if (!this.nodes[data.tag])
                        this.nodes[data.tag] = new SpanningTreeNode(this.address);

                    deferred.resolve(this.nodes[data.tag]);
                    return deferred.promise;

                case SpanningTreeMessages.SetLeft:
                    if (data.address) this.nodes[data.tag].left = Address.deserialise(data.address);
                    else delete this.nodes[data.tag]["left"];
                    break;

                case SpanningTreeMessages.SetRight:
                    if (data.address) this.nodes[data.tag].right = Address.deserialise(data.address);
                    else delete this.nodes[data.tag]["right"];
                    break;

                case SpanningTreeMessages.SetParent:
                    if (data.address) this.nodes[data.tag].parent = Address.deserialise(data.address);
                    else delete this.nodes[data.tag]["parent"];
                    break;

                case SpanningTreeMessages.Message:
                    if (!this.nodes[data.tag]) this.nodes[data.tag] = new SpanningTreeNode(this.address);

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
        })).then(() =>
        {
            this.persist(this.address, message);
            //
        }).catch(() => deferred.reject("Failed to publish message " + message.id));

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
                // Inserts a new node into the spanning tree associated with this tag to participate in multicasting.
                this.insert(root, tag)
                    .then(node => this.nodes[tag] = node)
                    .catch(() => deferred.reject("Failed to subscribe to " + subscription.id));
            });
        })).then(() =>
        {
            this.localSubscriptions = this.localSubscriptions.filter(s => s.id !== subscription.id).concat([ subscription ]);
            deferred.resolve(true);
            //
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

                // Checks if there are other subscriptions of this tag that depend on being member of the spanning tree.
                if (!ArrayUtilities.contains(ArrayUtilities.flatten(otherSubscriptions.map(s => s.tags)), tag))
                {
                    // If not, then remove node from the spanning tree unless it is the root (i.e. rendezvous point/responsible peer).
                    this.delete(tag).then(() => { if (this.nodes[tag].parent) this.nodes[tag] = null; });
                }

                return Helpers.resolvedUnit();
                //
            })).then(() =>
            {
                this.localSubscriptions = this.localSubscriptions.filter(s => s.id !== subscription.id);
                deferred.resolve(true);
                //
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

        // TODO Fix spanning tree when re-joining.

        return deferred.promise;
    }

    private repair()
    {
        for (var tag in this.nodes)
        {
            if (this.nodes.hasOwnProperty(tag))
            {
                var node = <SpanningTreeNode>this.nodes[tag];

                if (node)
                {
                    this.repairChildLinks(node, tag);
                    this.repairParentLink(node, tag);
                }
            }
        }
    }

    private repairChildLinks(node: SpanningTreeNode, tag: string)
    {
        if (node.left) this.ping(node.left).catch(() => delete this.nodes[tag]["left"]);
        if (node.right) this.ping(node.right).catch(() => delete this.nodes[tag]["right"]);
    }

    private repairParentLink(node: SpanningTreeNode, tag: string)
    {
        if (node.parent)
        {
            this.ping((node.parent)).then(() =>
            {
                // TODO Fix spanning tree when ancestor (parent, grand-parent etc.) fails and this peer (child, grand-child etc.) becomes new responsible peer/root. Needs to break bonds with current parent to become root.

                // BUG Four nodes 80-83, all joined and subscribing. Manually crash 80, then 83. 82 then either crashes by itself (due to some variable being undefined) or link between 81 and 82 is broken.

                this.lookup(tag).then(root =>
                {
                    if (root.equals(this.address))
                    {
                        this.setLeft(node.parent, tag, null);
                        delete this.nodes[tag]["parent"];
                    }
                });
            }).catch(() =>
            {
                // Parent node has failed, rejoins the spanning tree.
                var left = node.left;
                var right = node.right;
                this.nodes[tag] = new SpanningTreeNode(this.address);

                this.lookup(tag).then(root => this.insert(root, tag).then(n =>
                {
                    n.left = left;
                    n.right = right;
                    this.nodes[tag] = n;
                }));
            });
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
        return this.broker.send(this.address, RouterMessages.Lookup, tag)
            .then((a: any) => Address.deserialise(a));
    }

    private sendMessage(subscriber: Address, message: Message, tag: string): Promise<void>
    {
        return this.broker.send(subscriber, SpanningTreeMessages.Message, { message: message, tag: tag });
    }

    private insert(root: Address, tag: string): Promise<SpanningTreeNode>
    {
        var deferred = Q.defer<SpanningTreeNode>();

        this.getNode(root, tag).then(n =>
        {
            var alreadyInTree = false;
            var x = n;
            var y: SpanningTreeNode = null;
            var z = new SpanningTreeNode(this.address /*, tag*/);

            Helpers.promiseWhile(() => !!x, () =>
            {
                if (this.address.equals(x.address) || this.address.equals(x.left)
                    || this.address.equals(x.right) || this.address.equals(x.parent))
                {
                    alreadyInTree = true;
                    return Helpers.resolvedUnit().then(() => x = null);
                }

                y = x;

                if (z.key < x.key)
                {
                    if (x.left) return this.getNode(x.left, tag).then(left => x = left);
                    else return Helpers.resolvedUnit().then(() => x = null);
                }
                else
                {
                    if (x.right) return this.getNode(x.right, tag).then(right => x = right);
                    else return Helpers.resolvedUnit().then(() => x = null);
                }
                //
            }).then(() =>
            {
                if (!alreadyInTree)
                {
                    z.parent = y.address;

                    if (z.key < y.key) this.setLeft(y.address, tag, z.address);
                    else this.setRight(y.address, tag, z.address);

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
        return Helpers.promiseWhile(() => !!x.left, () =>
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
        return this.broker.send(peer, SpanningTreeMessages.GetNode, { tag: tag }).then(n => SpanningTreeNode.deserialise(n));
    }

    private setLeft(peer: Address, tag: string, left: Address): Promise<void>
    {
        return this.broker.send(peer, SpanningTreeMessages.SetLeft, { tag: tag, address: left });
    }

    private setRight(peer: Address, tag: string, right: Address): Promise<void>
    {
        //        console.log("SETTING RIGHT OF " + JSON.stringify(peer.toString()));
        return this.broker.send(peer, SpanningTreeMessages.SetRight, { tag: tag, address: right });
    }

    private setParent(peer: Address, tag: string, parent: Address): Promise<void>
    {
        return this.broker.send(peer, SpanningTreeMessages.SetParent, { tag: tag, address: parent });
    }

    private ping(subscriber: Address)
    {
        return this.broker.send(subscriber, RouterMessages.Ping, "");
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

export = SpanningTreeRouter;