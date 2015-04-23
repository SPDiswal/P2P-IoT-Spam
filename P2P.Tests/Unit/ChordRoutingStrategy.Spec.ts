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
// DONE The subscription callback is invoked when one subscription matches the message.
// DONE The subscription callbacks are invoked when two subscriptions match the message.
// DONE The subscription callback is only invoked once per message (no duplicates).
// TODO A peer can unsubscribe using a subscription GUID.
// TODO A peer has a limit on the number of recent messages to remember (to avoid duplicates).
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
        var subscription = new Subscription<string>(() => { }, [ "weather" ], () => true, fakeGenerator);

        strategy.subscribe(subscription);

        expect(sourceBroker.hasSent(MessageType.Subscribe, subscription)).toBeTruthy();
    });

    it("Can subscribe to a subscription with id 1, multiple tags and a filter", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1" ]);
        var subscription = new Subscription<string>(() => { }, [ "weather", "public information" ], () => true, fakeGenerator);

        strategy.subscribe(subscription);

        expect(sourceBroker.hasSent(MessageType.Subscribe, subscription)).toBeTruthy();
    });

    it("The subscription callback is invoked when one subscription matches the message", () =>
    {
        var hasBeenInvoked = false;

        var fakeGenerator = new FakeGuidGenerator([ "0", "1" ]);
        var subscription = new Subscription<string>(() => { hasBeenInvoked = true; }, [ "weather" ], () => true, fakeGenerator);
        var message = new Message<string>("sunny", [ "weather" ], fakeGenerator);

        strategy.subscribe(subscription);
        sourceBroker.raise(MessageType.Incoming, message);

        expect(hasBeenInvoked).toBeTruthy();
    });

    it("The subscription callbacks are invoked when two subscriptions match the message", () =>
    {
        var hasBeenInvoked = [ false, false ];
        var subscriptions: Array<Subscription<string>> = [ ];

        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2" ]);

        subscriptions.push(new Subscription<string>(() => { hasBeenInvoked[0] = true; }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription<string>(() => { hasBeenInvoked[1] = true; }, [ "public information" ], () => true, fakeGenerator));

        var message = new Message<string>("rainy", [ "weather", "public information" ], fakeGenerator);

        strategy.subscribe(subscriptions[0]);
        strategy.subscribe(subscriptions[1]);
        sourceBroker.raise(MessageType.Incoming, message);

        expect(hasBeenInvoked[0] && hasBeenInvoked[1]).toBeTruthy();
    });

    it("The subscription callback is only invoked once per message (no duplicates)", () =>
    {
        var invocations = [ 0, 0 ];
        var subscriptions: Array<Subscription<string>> = [ ];

        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2" ]);

        subscriptions.push(new Subscription<string>(() => { invocations[0]++; }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription<string>(() => { invocations[1]++; }, [ "public information" ], () => true, fakeGenerator));

        var message = new Message<string>("rainy", [ "weather", "public information" ], fakeGenerator);

        strategy.subscribe(subscriptions[0]);
        strategy.subscribe(subscriptions[1]);
        sourceBroker.raise(MessageType.Incoming, message);
        sourceBroker.raise(MessageType.Incoming, message);

        expect(invocations[0]).toBe(1);
        expect(invocations[1]).toBe(1);
    });
});