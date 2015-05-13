class Responsibility
{
    constructor(public identifier: string, public data: any)
    {
    }

    public static deserialise(input: any): Responsibility
    {
        var responsibility = new Responsibility(null, null);
        responsibility.identifier = input.identifier;
        responsibility.data = input.data;
        return responsibility;
    }
}

export = Responsibility;