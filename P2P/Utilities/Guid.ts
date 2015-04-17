class Guid
{
    public static Count = 41;

    public static create(): Guid
    {
        this.Count++;
        return this.Count;
    }
}
export = Guid;