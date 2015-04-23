class Guid
{
    constructor(private guid: string)
    {
    }

    public get id(): string
    {
        return this.guid;
    }

    // http://jsfiddle.net/briguy37/2MVFd/
    public static create(): Guid
    {
        var guidTemplate = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
        var time = new Date().getTime();

        var guid = guidTemplate.replace(/[xy]/g, c =>
        {
            var r = (time + Math.random() * 16) % 16 | 0;
            time = Math.floor(time / 16);
            return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
        });

        return new Guid(guid);
    }
}

export = Guid;