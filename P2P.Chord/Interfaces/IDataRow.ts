interface IDataRow
{
    id: string;
    contents: string;
    tags: Array<string>;
    timestamp: Date;
}

export = IDataRow;