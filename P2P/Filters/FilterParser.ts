import IFilterParser = require("./IFilterParser");

import Filter = require("./Filter");

class FilterParser implements IFilterParser
{
    public parse(filterExpression: string): Filter
    {
        return new Filter();
    }
}

export = FilterParser;