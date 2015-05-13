import Filter = require("../Common/Filter");

interface IFilterParser
{
    parse(filter: string): Filter;
}

export = IFilterParser;