import IGuidGenerator = require("../Guids/IGuidGenerator");

import GuidGenerator = require("../Guids/GuidGenerator");

class Message
{
    public id: string;

    constructor(public contents: any, public tags: Array<string>, generator: IGuidGenerator = new GuidGenerator())
    {
        this.id = generator.create();
    }

    public equals(that: Message): boolean
    {
        return this.id === that.id;
    }

    public static deserialise(input: any): Message
    {
        var message = new Message(null, new Array<string>());
        message.id = input.id;
        message.contents = input.contents;
        message.tags = input.tags;
        return message;
    }
}

export = Message;