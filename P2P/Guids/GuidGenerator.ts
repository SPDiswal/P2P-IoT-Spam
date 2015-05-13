import IGuidGenerator = require("./IGuidGenerator");

class GuidGenerator implements IGuidGenerator
{
    // Borrowed from http://jsfiddle.net/briguy37/2MVFd/
    public create(): string
    {
        var guidTemplate = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
        var time = new Date().getTime();

        return guidTemplate.replace(/[xy]/g, c =>
        {
            var r = (time + Math.random() * 16) % 16 | 0;
            time = Math.floor(time / 16);
            return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
}

export = GuidGenerator;