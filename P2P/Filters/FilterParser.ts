import IFilterParser = require("./IFilterParser");

import Filter = require("../Common/Filter");

class FilterParser implements IFilterParser
{
    public parse(filter: string): Filter
    {
        return new Filter();
    }
}

export = FilterParser;