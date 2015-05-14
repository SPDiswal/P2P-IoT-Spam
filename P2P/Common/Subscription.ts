import IGuidGenerator = require("../Guids/IGuidGenerator");

import Address = require("./Address");
import GuidGenerator = require("../Guids/GuidGenerator");
import Message = require("./Message");

class Subscription
{
    public id: string;

    constructor(public address: Address,
                public tags: Array<string>,
                public filter: string,
                public callback: (s: Message) => void,
                generator: IGuidGenerator = new GuidGenerator())
    {
        this.id = generator.create();
    }

    public equals(that: Subscription): boolean
    {
        if (!that) return false;
        return this.id === that.id;
    }

    public static deserialise(input: any): Subscription
    {
        var subscription = new Subscription(null, new Array<string>(), null, null);
        subscription.id = input.id;
        subscription.address = Address.deserialise(input.address);
        subscription.tags = input.tags;
        subscription.filter = input.filter;
        return subscription;
    }
}

export = Subscription;