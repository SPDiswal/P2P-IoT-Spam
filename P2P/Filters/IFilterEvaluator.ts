import Message = require("../Common/Message");

interface IFilterEvaluator
{
    evaluate(filterExpression: string, message: Message): boolean;
}

export = IFilterEvaluator;