import Message = require("../../P2P/Common/Message");

class DataRow
{
    constructor(public _id: string, public _contents: Message, public _timestamp: Date)
    {
    }
}

export = DataRow;