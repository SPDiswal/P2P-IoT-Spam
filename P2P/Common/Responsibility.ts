class Responsibility
{
    constructor(public identifier: string, public data: any)
    {
    }

    public static deserialise(input: any): Responsibility
    {
        if (input)
        {
            var responsibility = new Responsibility(null, null);
            responsibility.identifier = input.identifier;
            responsibility.data = input.data;
            return responsibility;            
        }

        return null;
    }
}

export = Responsibility;