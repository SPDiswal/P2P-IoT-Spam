import IFilterParser = require("./IFilterParser");

class FilterParser implements IFilterParser
{
    public parse(filter: (contents: any, tags: Array<string>) => boolean): string
    {
        return filter.toString();
    }
}

export = FilterParser;