import Guid = require("../../../P2P/Core/Guid");
import IGuidGenerator = require("../../../P2P/Interfaces/IGuidGenerator");

class FakeGuidGenerator implements IGuidGenerator
{
    constructor(private guids: Array<string>)
    {
    }

    public create(): Guid
    {
        return new Guid(this.guids.pop());
    }
}

export = FakeGuidGenerator;