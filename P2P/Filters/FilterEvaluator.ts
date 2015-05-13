import IFilterEvaluator = require("./IFilterEvaluator");

import Filter = require("../Common/Filter");
import Message = require("../Common/Message");

class FilterEvaluator implements IFilterEvaluator
{
    public evaluate(expression: Filter, message: Message): boolean
    {
        return true;
    }
}

export = FilterEvaluator;