/// <reference path="../Scripts/typings/jasmine/jasmine.d.ts" />

import Address = require("../../P2P/Core/Address");
import SubscriberListRoutingStrategy = require("../../P2P/Strategies/SubscriberListRoutingStrategy");
import FakeBroker = require("../Fakes/FakeBroker");
import FakeGuidGenerator = require("../Fakes/FakeGuidGenerator");
import Message = require("../../P2P/Core/Message");
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
// DONE The subscription callback is only invoked once per message when subscribing to two tags.
// DONE A peer can unsubscribe using a subscription GUID 42.
// DONE A peer can unsubscribe using a subscription GUID 1337.
// DONE The subscriber list has one subscription when receiving one Subscription message.
// DONE The subscriber list has two subscriptions when receiving two Subscription messages.
// DONE The subscriber list has no subscriptions when receiving one Unsubscription message when having one subscription.
// DONE The subscriber list has one subscription when receiving one Unsubscription message when having two subscriptions.
// DONE A subscriber list is sent to broker when receiving Subscribers message with subscribers 8080 and 8081.
// DONE A subscriber list is sent to broker when receiving Subscribers message with subscribers 8080, 8081 and 8082.
// DONE The subscriber list is filtered by tags when subscriptions have exactly one tag.
// DONE The subscriber list is filtered by tags when subscriptions have at least one tag.
// DONE The subscriber list is filtered by filter function when message must be filtered out in one subscription.
// DONE The subscriber list is filtered by filter function when message must be filtered out in two subscriptions.
// DONE When unsubscribed, the peer does not receive any messages that match the old subscription.

// TODO 

// TODO Upon subscribing, the peer receives all stored messages that match the subscription (send RetrieveAllMessages).
// TODO A peer has a limit on the number of recent messages to remember (to avoid duplicates).
// :::::::::::::::::::

describe("SubscriberListRoutingStrategy", () =>
{
    var sourceAddress: IAddress, sourceBroker: FakeBroker, strategy: SubscriberListRoutingStrategy;

    beforeEach(() =>
    {
        sourceAddress = new Address("127.0.0.1", 8080);
        sourceBroker = new FakeBroker(sourceAddress);
        strategy = new SubscriberListRoutingStrategy(sourceAddress, sourceBroker);
    });

    it("Can join peer at 127.0.0.1:8081", () =>
    {
        var targetAddress = new Address("127.0.0.1", 8081);
        strategy.join(targetAddress);

        expect(sourceBroker.hasSent("Join", targetAddress)).toBeTruthy();
    });

    it("Can join peer at 127.0.0.1:8082", () =>
    {
        var targetAddress = new Address("127.0.0.1", 8082);
        strategy.join(targetAddress);

        expect(sourceBroker.hasSent("Join", targetAddress)).toBeTruthy();
    });

    it("Can publish a message with id 0 (\"sunny\" in Weather)", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var message = new Message("sunny", [ "weather" ], fakeGenerator);

        strategy.publish(message);

        expect(sourceBroker.hasSent("Publish", message)).toBeTruthy();
    });

    it("Can publish a message with id 1 (\"rainy\" in Weather, Public information)", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1" ]);
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        strategy.publish(message);

        expect(sourceBroker.hasSent("Publish", message)).toBeTruthy();
    });

    it("Can subscribe to a subscription with id 0, a single tag and a filter", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator);

        strategy.subscribe(subscription);

        expect(sourceBroker.hasSent("Subscribe", subscription)).toBeTruthy();
    });

    it("Can subscribe to a subscription with id 1, multiple tags and a filter", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather", "public information" ], () => true, fakeGenerator);

        strategy.subscribe(subscription);

        expect(sourceBroker.hasSent("Subscribe", subscription)).toBeTruthy();
    });

    it("The subscription callback is invoked when one subscription matches the message", () =>
    {
        var hasBeenInvoked = false;

        var fakeGenerator = new FakeGuidGenerator([ "0", "1" ]);
        var subscription = new Subscription(sourceAddress, () => { hasBeenInvoked = true; }, [ "weather" ], () => true, fakeGenerator);
        var message = new Message("sunny", [ "weather" ], fakeGenerator);

        strategy.subscribe(subscription);
        sourceBroker.raise("Message", message);

        expect(hasBeenInvoked).toBeTruthy();
    });

    it("The subscription callbacks are invoked when two subscriptions match the message", () =>
    {
        var hasBeenInvoked = [ false, false ];
        var subscriptions: Array<Subscription> = [ ];

        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2" ]);

        subscriptions.push(new Subscription(sourceAddress, () => { hasBeenInvoked[0] = true; }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(sourceAddress, () => { hasBeenInvoked[1] = true; }, [ "public information" ], () => true, fakeGenerator));

        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        strategy.subscribe(subscriptions[0]);
        strategy.subscribe(subscriptions[1]);
        sourceBroker.raise("Message", message);

        expect(hasBeenInvoked[0] && hasBeenInvoked[1]).toBeTruthy();
    });

    it("The subscription callback is only invoked once per message (no duplicates)", () =>
    {
        var invocations = [ 0, 0 ];
        var subscriptions: Array<Subscription> = [ ];

        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2" ]);

        subscriptions.push(new Subscription(sourceAddress, () => { invocations[0]++; }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(sourceAddress, () => { invocations[1]++; }, [ "public information" ], () => true, fakeGenerator));

        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        strategy.subscribe(subscriptions[0]);
        strategy.subscribe(subscriptions[1]);
        sourceBroker.raise("Message", message);
        sourceBroker.raise("Message", message);

        expect(invocations[0]).toBe(1);
        expect(invocations[1]).toBe(1);
    });

    it("The subscription callback is only invoked once per message when subscribing to two tags", () =>
    {
        var invocations = 0;
        var fakeGenerator = new FakeGuidGenerator([ "0", "1" ]);
        var subscription = new Subscription(sourceAddress, () => { invocations++; }, [ "weather", "public information" ], () => true, fakeGenerator);
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        strategy.subscribe(subscription);
        sourceBroker.raise("Message", message);

        expect(invocations).toBe(1);
    });

    it("Can unsubscribe to a subscription with id 42", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "42" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator);

        strategy.subscribe(subscription);
        strategy.unsubscribe(subscription.id);

        expect(sourceBroker.hasSent("Unsubscribe", subscription.id)).toBeTruthy();
    });

    it("Can unsubscribe to a subscription with id 1337", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1337" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator);

        strategy.subscribe(subscription);
        strategy.unsubscribe(subscription.id);

        expect(sourceBroker.hasSent("Unsubscribe", subscription.id)).toBeTruthy();
    });

    it("The subscriber list has one subscription when receiving one Subscription message", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator);

        sourceBroker.raise("Subscription", subscription);

        expect(strategy.subscribers.length).toBe(1);
    });

    it("The subscriber list has two subscriptions when receiving two Subscription messages", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1" ]);

        subscriptions.push(new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(sourceAddress, () => { }, [ "public information" ], () => true, fakeGenerator));

        sourceBroker.raise("Subscription", subscriptions[0]);
        sourceBroker.raise("Subscription", subscriptions[1]);

        expect(strategy.subscribers.length).toBe(2);
    });

    it("The subscriber list has no subscriptions when receiving one Unsubscription message for existing subscription", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator);

        sourceBroker.raise("Subscription", subscription);
        sourceBroker.raise("Unsubscription", subscription.id);

        expect(strategy.subscribers.length).toBe(0);
    });

    it("The subscriber list has one subscription when receiving one Unsubscription message when having two subscriptions", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1" ]);

        subscriptions.push(new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(sourceAddress, () => { }, [ "public information" ], () => true, fakeGenerator));

        sourceBroker.raise("Subscription", subscriptions[0]);
        sourceBroker.raise("Subscription", subscriptions[1]);
        sourceBroker.raise("Unsubscription", subscriptions[0].id);

        expect(strategy.subscribers.length).toBe(1);
        expect(strategy.subscribers[0].id).toBe(subscriptions[1].id);
    });

    it("A subscriber list is sent to broker when receiving Subscribers message with subscribers 8080 and 8081", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "public information" ], () => true, fakeGenerator));
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        sourceBroker.raise("Subscription", subscriptions[0]);
        sourceBroker.raise("Subscription", subscriptions[1]);
        sourceBroker.raise("Subscribers", message);

        expect(sourceBroker.hasSent("FilteredSubscribers", [ new Address("127.0.0.1", 8080), new Address("127.0.0.1", 8081) ])).toBeTruthy();
    });

    it("A subscriber list is sent to broker when receiving Subscribers message with subscribers 8080, 8081 and 8082", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2", "3" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "public information" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "weather", "public information" ], () => true, fakeGenerator));
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        sourceBroker.raise("Subscription", subscriptions[0]);
        sourceBroker.raise("Subscription", subscriptions[1]);
        sourceBroker.raise("Subscription", subscriptions[2]);
        sourceBroker.raise("Subscribers", message);

        expect(sourceBroker.hasSent("FilteredSubscribers", [ new Address("127.0.0.1", 8080), new Address("127.0.0.1", 8081), new Address("127.0.0.1", 8082) ])).toBeTruthy();
    });

    it("The subscriber list is filtered by tags when subscriptions have exactly one tag", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2", "3" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "stocks" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "public information" ], () => true, fakeGenerator));
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        sourceBroker.raise("Subscription", subscriptions[0]);
        sourceBroker.raise("Subscription", subscriptions[1]);
        sourceBroker.raise("Subscription", subscriptions[2]);
        sourceBroker.raise("Subscribers", message);

        expect(sourceBroker.hasSent("FilteredSubscribers", [ new Address("127.0.0.1", 8080), new Address("127.0.0.1", 8082) ])).toBeTruthy();
    });

    it("The subscriber list is filtered by tags when subscriptions have at least one tag", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2", "3" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather", "stocks" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "stocks" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "weather", "public information" ], () => true, fakeGenerator));
        var message = new Message("C20, +0.2%", [ "stocks" ], fakeGenerator);

        sourceBroker.raise("Subscription", subscriptions[0]);
        sourceBroker.raise("Subscription", subscriptions[1]);
        sourceBroker.raise("Subscription", subscriptions[2]);
        sourceBroker.raise("Subscribers", message);

        expect(sourceBroker.hasSent("FilteredSubscribers", [ new Address("127.0.0.1", 8080), new Address("127.0.0.1", 8081) ])).toBeTruthy();
    });

    it("The subscriber list is filtered by filter function when message must be filtered out in one subscription", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2", "3" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "weather" ], () => false, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "weather" ], () => true, fakeGenerator));
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        sourceBroker.raise("Subscription", subscriptions[0]);
        sourceBroker.raise("Subscription", subscriptions[1]);
        sourceBroker.raise("Subscription", subscriptions[2]);
        sourceBroker.raise("Subscribers", message);

        expect(sourceBroker.hasSent("FilteredSubscribers", [ new Address("127.0.0.1", 8080), new Address("127.0.0.1", 8082) ])).toBeTruthy();
    });

    it("The subscriber list is filtered by filter function when message must be filtered out in two subscriptions", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2", "3" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], m => m.contents === "snowy", fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "weather" ], () => false, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "weather" ], () => true, fakeGenerator));
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        sourceBroker.raise("Subscription", subscriptions[0]);
        sourceBroker.raise("Subscription", subscriptions[1]);
        sourceBroker.raise("Subscription", subscriptions[2]);
        sourceBroker.raise("Subscribers", message);

        expect(sourceBroker.hasSent("FilteredSubscribers", [ new Address("127.0.0.1", 8082) ])).toBeTruthy();
    });

    it("When unsubscribed, the peer does not receive any messages that match the old subscription.", () =>
    {
        var hasBeenInvoked = [ false, false ];
        var subscriptions: Array<Subscription> = [ ];

        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2" ]);

        subscriptions.push(new Subscription(sourceAddress, () => { hasBeenInvoked[0] = true; }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(sourceAddress, () => { hasBeenInvoked[1] = true; }, [ "public information" ], () => true, fakeGenerator));

        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        strategy.subscribe(subscriptions[0]);
        strategy.subscribe(subscriptions[1]);
        strategy.unsubscribe("1");
        sourceBroker.raise("Message", message);

        expect(hasBeenInvoked[0] && !hasBeenInvoked[1]).toBeTruthy();
    });
});