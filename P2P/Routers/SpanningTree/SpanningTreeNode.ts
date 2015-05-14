import Subscription = require("../../Common/Subscription");
import Address = require("../../Common/Address");
import Helpers = require("../../Utilities/Helpers");

class SpanningTreeNode
{
    constructor(public address: Address /*, public tag: string*/)
    {
        //        this.tag = tag;
        this.key = Helpers.hash(address.toString());
    }

    public key: number;
    public left: Address;
    public right: Address;
    public parent: Address;

    //    public subscription: Subscription;

    public static deserialise(input: any): SpanningTreeNode
    {
        var node = new SpanningTreeNode(Address.deserialise(input.address));
        node.key = input.key;
        // node.tag = input.tag;
        node.left = input.left ? Address.deserialise(input.left) : null;
        node.right = input.right ? Address.deserialise(input.right) : null;
        node.parent = input.parent ? Address.deserialise(input.parent) : null;
        //        node.subscription = input.subscription ? Subscription.deserialise(input.subscription) : null;
        return node;
    }
}

export = SpanningTreeNode;