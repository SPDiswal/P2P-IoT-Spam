import Subscription = require("../../Common/Subscription");
import Address = require("../../Common/Address");
import Helpers = require("../../Utilities/Helpers");

class SpanningTreeNode
{
    constructor(public address: Address/*, public tag: string*/)
    {
        this.address = address;
//        this.tag = tag;
        this.key = Helpers.hash(address.toString());
    }

    public key: number;
    public left: Address;
    public right: Address;
    public parent: Address;
    public subscription: Subscription;
}

export = SpanningTreeNode;