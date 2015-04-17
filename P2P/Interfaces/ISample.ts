import Guid = require("../Utilities/Guid");

interface ISample<TContents>
{
    id: Guid;
    contents: TContents;
    tags: Array<string>;
}

export = ISample;