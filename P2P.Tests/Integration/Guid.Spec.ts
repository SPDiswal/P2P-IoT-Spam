/// <reference path="../Scripts/typings/jasmine/jasmine.d.ts" />

import Guid = require("../../P2P/Core/Guid");
import GuidGenerator = require("../../P2P/Utilities/GuidGenerator");

describe("GUID generation", () =>
{
    it("Should not collide when there are many GUIDs", () =>
    {
        var count = 42;
        var guids: Array<Guid> = [];

        var generator = new GuidGenerator();

        for (var i = 0; i < count; i++)
            guids.push(generator.create());

        expect(guids.map(value => value.id).filter((value, index, self) => self.indexOf(value) === index).length).toBe(count);
    });
});