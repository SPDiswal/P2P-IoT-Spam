import IFilterEvaluator = require("./IFilterEvaluator");

import Message = require("../Common/Message");

class FilterEvaluator implements IFilterEvaluator
{
    public evaluate(filter: string, message: Message): boolean
    {
        return !!eval("(" + filter + ")(" + JSON.stringify(message.tags) + ", " + JSON.stringify(message.contents) + ");");
    }
}

export = FilterEvaluator;