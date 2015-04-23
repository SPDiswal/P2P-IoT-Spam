/// <reference path="../Scripts/typings/jasmine/jasmine.d.ts" />

import Address = require("../../P2P/Core/Address");
import ChordRoutingStrategy = require("../../P2P/Strategies/ChordRoutingStrategy");
import FakeBroker = require("../Fakes/Broker/FakeBroker");
import FakeGuidGenerator = require("../Fakes/Broker/FakeGuidGenerator");
import Message = require("../../P2P/Core/Message");
import MessageType = require("../../P2P.Broker/Enumerations/MessageType");
import Subscription = require("../../P2P/Core/Subscription");
import IAddress = require("../../P2P/Interfaces/IAddress");

// :::: TEST LIST ::::
// DONE A peer can join peer at 127.0.0.1:8081.
// DONE A peer can join peer at 127.0.0.1:8082.
// DONE A peer can publish a message with id 0 ("sunny" in Weather).
// DONE A peer can publish a message with id 1 ("rainy" in Weather, Public information).
// DONE A peer can subscribe to a subscription with id 0, a single tag and a filter.
// DONE A peer can subscribe to a subscription with id 1, multiple tags and a filter.
// TODO When subscribing, the peer only receives a published message once (no duplicates).
// TODO When receiving a message, the subscription callback is invoked on the subscribing peer.
// TODO A peer can unsubscribe using a subscription GUID.
// :::::::::::::::::::

describe("ChordRoutingStrategy", () =>
{
    var sourceAddress: IAddress, sourceBroker: FakeBroker, strategy: ChordRoutingStrategy;

    beforeEach(() =>
    {
        sourceAddress = new Address("127.0.0.1", 8080);
        sourceBroker = new FakeBroker(sourceAddress);
        strategy = new ChordRoutingStrategy(sourceBroker);
    });

    it("Can join peer at 127.0.0.1:8081", () =>
    {
        var targetAddress = new Address("127.0.0.1", 8081);
        strategy.join(targetAddress);

        expect(sourceBroker.hasSent(MessageType.Join, targetAddress)).toBeTruthy();
    });

    it("Can join peer at 127.0.0.1:8082", () =>
    {
        var targetAddress = new Address("127.0.0.1", 8082);
        strategy.join(targetAddress);

        expect(sourceBroker.hasSent(MessageType.Join, targetAddress)).toBeTruthy();
    });

    it("Can publish a message with id 0 (\"sunny\" in Weather)", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var message = new Message<string>("sunny", [ "weather" ], fakeGenerator);

        strategy.publish(message);

        expect(sourceBroker.hasSent(MessageType.Publish, message)).toBeTruthy();
    });

    it("Can publish a message with id 1 (\"rainy\" in Weather, Public information)", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1" ]);
        var message = new Message<string>("rainy", [ "weather", "public information" ], fakeGenerator);

        strategy.publish(message);

        expect(sourceBroker.hasSent(MessageType.Publish, message)).toBeTruthy();
    });

    it("Can subscribe to a subscription with id 0, a single tag and a filter", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var subscription = new Subscription<string>([ "weather" ], () => true, fakeGenerator);

        strategy.subscribe(subscription);

        expect(sourceBroker.hasSent(MessageType.Subscribe, subscription)).toBeTruthy();
    });

    it("Can subscribe to a subscription with id 1, multiple tags and a filter", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1" ]);
        var subscription = new Subscription<string>([ "weather", "public information" ], () => true, fakeGenerator);

        strategy.subscribe(subscription);

        expect(sourceBroker.hasSent(MessageType.Subscribe, subscription)).toBeTruthy();
    });
});