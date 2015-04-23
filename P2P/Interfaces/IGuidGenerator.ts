import Guid = require("../Core/Guid");

interface IGuidGenerator
{
    create(): Guid;
}

export = IGuidGenerator;