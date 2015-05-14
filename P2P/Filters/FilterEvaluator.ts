import IFilterEvaluator = require("./IFilterEvaluator");
import IFilterParser = require("./IFilterParser");

import Filter = require("./Filter");
import Message = require("../Common/Message");

class FilterEvaluator implements IFilterEvaluator
{
    constructor(private parser: IFilterParser)
    {
    }

    public evaluate(filterExpression: string, message: Message): boolean
    {
        return true;
    }
}

export = FilterEvaluator;