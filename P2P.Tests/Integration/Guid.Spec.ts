/// <reference path="../Scripts/typings/jasmine/jasmine.d.ts" />

import GuidGenerator = require("../../P2P/Utilities/GuidGenerator");

describe("GUID generation", () =>
{
    it("Should not collide when there are many GUIDs", () =>
    {
        var count = 42;
        var guids: Array<string> = [];

        var generator = new GuidGenerator();

        for (var i = 0; i < count; i++)
            guids.push(generator.create());

        expect(guids.filter((value, index, self) => self.indexOf(value) === index).length).toBe(count);
    });
});