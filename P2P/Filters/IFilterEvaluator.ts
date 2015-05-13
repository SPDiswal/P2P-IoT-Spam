import Filter = require("../Common/Filter");
import Message = require("../Common/Message");

interface IFilterEvaluator
{
    evaluate(expression: Filter, message: Message): boolean;
}

export = IFilterEvaluator;