class Guid
{
    constructor(private guid: string)
    {
    }

    public get id(): string
    {
        return this.guid;
    }

    public equals(that: Guid): boolean
    {
        return this.guid === that.guid;
    }
}

export = Guid;