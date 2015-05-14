import Filter = require("./Filter");

interface IFilterParser
{
    parse(filterExpression: string): Filter;
}

export = IFilterParser;