interface IFilterParser
{
    parse(filter: (contents: any, tags: Array<string>) => boolean): string;
}

export = IFilterParser;