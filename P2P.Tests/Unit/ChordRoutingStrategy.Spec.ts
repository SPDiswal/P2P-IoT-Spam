/// <reference path="../Scripts/typings/jasmine/jasmine.d.ts" />

import Address = require("../../P2P/Core/Address");
import ChordRoutingStrategy = require("../../P2P/Strategies/ChordRoutingStrategy");
import FakeBroker = require("../Fakes/Broker/FakeBroker");
import MessageType = require("../../P2P.Broker/Enumerations/MessageType");

// :::: TEST LIST ::::
// DONE A peer can join peer at 127.0.0.1:8081.
// DONE A peer can join peer at 127.0.0.1:8082.
// TODO A peer can publish a message.
// TODO Published messages must be stored in the system.
// TODO Published messages are discarded after exceeding their lifetime.
// TODO A peer can subscribe to a topic defined by TContents.
// TODO A peer can subscribe to a single tag.
// TODO A peer can subscribe to multiple tags.
// TODO A peer can subscribe with filter.
// TODO Upon subscribing, the peer receives the GUID for the subscription.
// TODO Upon subscribing, the peer receives all stored messages that match the subscription.
// TODO When subscribing, the peer receives all published messages that match the subscription.
// TODO When subscribing, the peer only receives a published message once (no duplicates).
// TODO When receiving a message, the subscription callback is invoked on the subscribing peer.
// TODO A peer can unsubscribe using a subscription GUID.
// TODO When unsubscribed, the peer does not receive any messages that match the old subscription.
// :::::::::::::::::::

describe("ChordRoutingStrategy", () =>
{
    it("Can join peer at 127.0.0.1:8081", () =>
    {
        var sourceAddress = new Address("127.0.0.1", 8080);
        var targetAddress = new Address("127.0.0.1", 8081);

        var sourceBroker = new FakeBroker(sourceAddress);
        var strategy = new ChordRoutingStrategy(sourceBroker);

        strategy.join(targetAddress);

        expect(sourceBroker.hasSent(MessageType.Join, targetAddress)).toBeTruthy();
    });

    it("Can join peer at 127.0.0.1:8082", () =>
    {
        var sourceAddress = new Address("127.0.0.1", 8080);
        var targetAddress = new Address("127.0.0.1", 8082);

        var sourceBroker = new FakeBroker(sourceAddress);
        var strategy = new ChordRoutingStrategy(sourceBroker);

        strategy.join(targetAddress);

        expect(sourceBroker.hasSent(MessageType.Join, targetAddress)).toBeTruthy();
    });

    //    it("Can publish a message", () =>
    //    {
    //        var sourceAddress = new Address("127.0.0.1", 8080);
    //        var sourceBroker = new FakeBroker(sourceAddress);
    //        var strategy = new ChordRoutingStrategy(sourceBroker);
    //
    //        var message = new Message();
    //
    //        strategy.publish();
    //
    ////        expect(sourceBroker.hasSent(MessageType.Join, targetAddress)).toBeTruthy();
    //    });
});