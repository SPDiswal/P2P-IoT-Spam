/// <reference path="../Scripts/typings/jasmine/jasmine.d.ts" />

import Address = require("../../P2P/Core/Address");
import SubscriberListRoutingStrategy = require("../../P2P/Strategies/SubscriberListRoutingStrategy");
import FakeBroker = require("../Fakes/FakeBroker");
import FakeGuidGenerator = require("../Fakes/FakeGuidGenerator");
import Message = require("../../P2P/Core/Message");
import Subscription = require("../../P2P/Core/Subscription");

// :::: TEST LIST ::::
// DONE A peer can join peer at 127.0.0.1:8081.
// DONE A peer can join peer at 127.0.0.1:8082.
// DONE When publishing a message with one tag ("Weather") it sends one "Lookup" to itself via broker.
// DONE When publishing a message with two tags ("Weather", "Public information") it sends two "Lookup"'s to itself via broker.
// DONE When publishing a message with one tag ("Weather") it sends "GetSubscriberList" to responsible peer via broker.
// DONE When publishing a message with two tags ("Weather", "Public information") it sends two "GetSubscriberList"'s to each responsible peer via broker.
// DONE When publishing a message with one tag ("Weather") it sends "Message"'s to all subscribing peers via broker.
// DONE When publishing a message with two tags ("Weather", "Public information") it sends "Message"'s to all subscribing peers via broker.
// DONE When publishing a message with two tags where a peer subscribes individually two both tags it only sends a single "Message" to that peer.
// DONE When subscribing to one tag ('Weather'), it sends via broker one Lookup to itself and one AddSubscriber to responsible peer.
// DONE When subscribing to one tag ('Weather') and signalling retrieval of old messages, it sends via broker one Lookup to itself, one AddSubscriber to responsible peer and one RetrieveAllMessages to responsible peer.
// DONE When subscribing to two tags ('Weather', 'Public information'), it sends via broker two Lookups to itself and two AddSubscribers to responsible peers.
// DONE When subscribing to two tags ('Weather', 'Public information') and signalling retrieval of old messages, it sends via broker two Lookups to itself, two AddSubscribers to responsible peers and two RetrieveAllMessages to responsible peers.
// DONE When unsubscribing to subscription with one tag ('Weather'), it sends via broker one Lookup to itself and one RemoveSubscription to responsible peer.
// DONE When unsubscribing to subscription with two tags ('Weather', 'Public information'), it sends via broker two Lookups to itself and two RemoveSubscriptions to responsible peer.
// DONE The subscription callback is invoked when one subscription matches the message.
// DONE The subscription callbacks are invoked when two subscriptions match the message.
// DONE The subscription callback is only invoked once per message (no duplicates).
// DONE The subscription callback is only invoked once per message when subscribing to two tags.
// DONE The subscriber list has one subscription when receiving one AddSubscription message.
// DONE The subscriber list has two subscriptions when receiving two AddSubscription messages.
// DONE The subscriber list has no subscriptions when receiving one RemoveSubscription message when having one subscription.
// DONE The subscriber list has one subscription when receiving one RemoveSubscription message when having two subscriptions.
// DONE A subscriber list is sent to broker when receiving GetSubscriberList message with subscribers 8080 and 8081.
// DONE A subscriber list is sent to broker when receiving GetSubscriberList message with subscribers 8080, 8081 and 8082.
// DONE The subscriber list is filtered by tags when subscriptions have exactly one tag.
// DONE The subscriber list is filtered by tags when subscriptions have at least one tag.
// DONE The subscriber list is filtered by filter function when message must be filtered out in one subscription.
// DONE The subscriber list is filtered by filter function when message must be filtered out in two subscriptions.
// DONE When unsubscribed, the peer does not receive any messages that match the old subscription.

// BOB Upon subscribing, the peer receives all stored messages that match the subscription (send RetrieveAllMessages).
// BOB A peer has a limit on the number of recent messages to remember (to avoid duplicates).
// :::::::::::::::::::

describe("SubscriberListRoutingStrategy", () =>
{
    var sourceAddress: Address, sourceBroker: FakeBroker, strategy: SubscriberListRoutingStrategy;

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

        expect(sourceBroker.hasSent(sourceAddress, "Join", targetAddress)).toBeTruthy();
    });

    it("Can join peer at 127.0.0.1:8082", () =>
    {
        var targetAddress = new Address("127.0.0.1", 8082);
        strategy.join(targetAddress);

        expect(sourceBroker.hasSent(sourceAddress, "Join", targetAddress)).toBeTruthy();
    });

    it("When publishing a message with one tag ('Weather') it sends one 'lookup' to broker.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var message = new Message("sunny", [ "weather" ], fakeGenerator);

        sourceBroker.fakeReturnValue(sourceAddress);
        sourceBroker.fakeReturnValue([ ]);

        strategy.publish(message);

        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
    });

    it("When publishing a message with two tags ('Weather', 'Public information') it sends two 'lookup''s to broker.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1" ]);
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        sourceBroker.fakeReturnValue(sourceAddress);
        sourceBroker.fakeReturnValue(sourceAddress);
        sourceBroker.fakeReturnValue([ ]);
        sourceBroker.fakeReturnValue([ ]);

        strategy.publish(message);

        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "public information")).toBeTruthy();
    });

    it("When publishing a message with one tag ('Weather') it sends 'GetSubscriberList' to responsible peer via broker.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var message = new Message("sunny", [ "weather" ], fakeGenerator);

        var targetAddress = new Address("127.0.0.1", 8081);
        sourceBroker.fakeReturnValue(targetAddress);
        sourceBroker.fakeReturnValue([ ]);

        strategy.publish(message);

        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(targetAddress, "GetSubscriberList", message)).toBeTruthy();
    });

    it("When publishing a message with two tags ('Weather', 'Public information') it sends two 'GetSubscriberList''s to each responsible peer via broker.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1" ]);
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        var targetAddresses = [ new Address("127.0.0.1", 8081), new Address("127.0.0.1", 8082) ];
        sourceBroker.fakeReturnValue(targetAddresses[0]);
        sourceBroker.fakeReturnValue(targetAddresses[1]);
        sourceBroker.fakeReturnValue([ ]);
        sourceBroker.fakeReturnValue([ ]);

        strategy.publish(message);

        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "public information")).toBeTruthy();
        expect(sourceBroker.hasSent(targetAddresses[0], "GetSubscriberList", message)).toBeTruthy();
        expect(sourceBroker.hasSent(targetAddresses[1], "GetSubscriberList", message)).toBeTruthy();
    });

    it("When publishing a message with one tag ('Weather') it sends 'Message''s to all subscribing peers via broker.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0", "42", "1337" ]);
        var message = new Message("sunny", [ "weather" ], fakeGenerator);

        var responsiblePeerAddress = new Address("127.0.0.1", 8081);
        sourceBroker.fakeReturnValue(responsiblePeerAddress);

        var subscriptions: Array<Subscription> = [
            new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], () => true, fakeGenerator),
            new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "public information" ], () => true, fakeGenerator)
        ];

        sourceBroker.fakeReturnValue(subscriptions);

        strategy.publish(message);

        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddress, "GetSubscriberList", message)).toBeTruthy();
        expect(sourceBroker.hasSent(<Address>subscriptions[0].address, "Message", message)).toBeTruthy();
        expect(sourceBroker.hasSent(<Address>subscriptions[1].address, "Message", message)).toBeTruthy();
    });

    it("When publishing a message with two tags ('Weather', 'Public information') it sends 'Message''s to all subscribing peers via broker.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1", "13", "37", "31", "56" ]);
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        var responsiblePeerAddresses = [ new Address("127.0.0.1", 8081), new Address("127.0.0.1", 8082) ];
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[0]);
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[1]);

        var subscriptions = [
            [
                new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], () => true, fakeGenerator),
                new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "weather" ], () => true, fakeGenerator)
            ],
            [
                new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "public information" ], () => true, fakeGenerator),
                new Subscription(new Address("127.0.0.1", 8083), () => { }, [ "public information" ], () => true, fakeGenerator)
            ]
        ];

        sourceBroker.fakeReturnValue(subscriptions[0]);
        sourceBroker.fakeReturnValue(subscriptions[1]);

        strategy.publish(message);

        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "public information")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[0], "GetSubscriberList", message)).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[1], "GetSubscriberList", message)).toBeTruthy();
        expect(sourceBroker.hasSent(<Address>subscriptions[0][0].address, "Message", message)).toBeTruthy();
        expect(sourceBroker.hasSent(<Address>subscriptions[0][1].address, "Message", message)).toBeTruthy();
        expect(sourceBroker.hasSent(<Address>subscriptions[1][0].address, "Message", message)).toBeTruthy();
        expect(sourceBroker.hasSent(<Address>subscriptions[1][1].address, "Message", message)).toBeTruthy();
    });

    it("When publishing a message with two tags where a peer subscribes individually two both tags it only sends a single 'Message' to that peer.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1", "13", "37", "31", "56" ]);
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        var responsiblePeerAddresses = [ new Address("127.0.0.1", 8081), new Address("127.0.0.1", 8082) ];
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[0]);
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[1]);

        var subscriptions = [
            [
                new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], () => true, fakeGenerator),
                new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "weather", "public information" ], () => true, fakeGenerator)
            ],
            [
                new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "public information" ], () => true, fakeGenerator)
            ]
        ];

        sourceBroker.fakeReturnValue(subscriptions[0]);
        sourceBroker.fakeReturnValue(subscriptions[1].concat([ subscriptions[0][1] ]));

        strategy.publish(message);

        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "public information")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[0], "GetSubscriberList", message)).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[1], "GetSubscriberList", message)).toBeTruthy();
        expect(sourceBroker.hasSent(<Address>subscriptions[0][0].address, "Message", message)).toBeTruthy();
        expect(sourceBroker.hasSent(<Address>subscriptions[0][1].address, "Message", message)).toBeTruthy();
        expect(sourceBroker.hasSent(<Address>subscriptions[1][0].address, "Message", message)).toBeTruthy();
    });

    it("When subscribing to one tag ('Weather'), it sends via broker one Lookup to itself and one AddSubscriber to responsible peer.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator);

        var responsiblePeerAddress = new Address("127.0.0.1", 8081);
        sourceBroker.fakeReturnValue(responsiblePeerAddress);

        strategy.subscribe(subscription);

        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddress, "AddSubscription", subscription)).toBeTruthy();
    });

    it("When subscribing to one tag ('Weather') and signalling retrieval of old messages, it sends via broker one Lookup to itself, one AddSubscriber to responsible peer and one RetrieveAllMessages to responsible peer.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator);

        var responsiblePeerAddress = new Address("127.0.0.1", 8081);
        sourceBroker.fakeReturnValue(responsiblePeerAddress);

        strategy.subscribe(subscription, true);

        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddress, "AddSubscription", subscription)).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddress, "RetrieveAllMessages", subscription)).toBeTruthy();
    });

    it("When subscribing to two tags ('Weather', 'Public information'), it sends via broker two Lookups to itself and two AddSubscribers to responsible peers.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather", "public information" ], () => true, fakeGenerator);

        var responsiblePeerAddresses = [ new Address("127.0.0.1", 8081), new Address("127.0.0.1", 8082) ];
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[0]);
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[1]);

        strategy.subscribe(subscription);

        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "public information")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[0], "AddSubscription", subscription)).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[1], "AddSubscription", subscription)).toBeTruthy();
    });

    it("When subscribing to two tags ('Weather', 'Public information') and signalling retrieval of old messages, it sends via broker two Lookups to itself, two AddSubscribers to responsible peers and two RetrieveAllMessages to responsible peers.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather", "public information" ], () => true, fakeGenerator);

        var responsiblePeerAddresses = [ new Address("127.0.0.1", 8081), new Address("127.0.0.1", 8082) ];
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[0]);
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[1]);

        strategy.subscribe(subscription, true);

        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "public information")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[0], "AddSubscription", subscription)).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[1], "AddSubscription", subscription)).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[0], "RetrieveAllMessages", subscription)).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[1], "RetrieveAllMessages", subscription)).toBeTruthy();
    });

    it("When unsubscribing to subscription with one tag ('Weather'), it sends via broker one Lookup to itself and one RemoveSubscription to responsible peer.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator);

        var responsiblePeerAddress = new Address("127.0.0.1", 8081);
        sourceBroker.fakeReturnValue(responsiblePeerAddress); // subscribe\Lookup
        sourceBroker.fakeReturnValue(null); // subscribe\AddSubscription
        sourceBroker.fakeReturnValue(responsiblePeerAddress); // unsubscribe\Lookup
        sourceBroker.fakeReturnValue(null); // unsubscribe\RemoveSubscription

        strategy.subscribe(subscription);
        strategy.unsubscribe("0");

        // From .subscribe().
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddress, "AddSubscription", subscription)).toBeTruthy();

        // From .unsubscribe().
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddress, "RemoveSubscription", "0")).toBeTruthy();
    });

    it("When unsubscribing to subscription with two tags ('Weather', 'Public information'), it sends via broker two Lookups to itself and two RemoveSubscriptions to responsible peer.", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather", "public information" ], () => true, fakeGenerator);

        var responsiblePeerAddresses = [ new Address("127.0.0.1", 8081), new Address("127.0.0.1", 8082) ];
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[0]); // subscribe\Lookup
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[1]); // subscribe\Lookup
        sourceBroker.fakeReturnValue(null); // subscribe\AddSubscription
        sourceBroker.fakeReturnValue(null); // subscribe\AddSubscription
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[0]); // unsubscribe\Lookup
        sourceBroker.fakeReturnValue(responsiblePeerAddresses[1]); // unsubscribe\Lookup
        sourceBroker.fakeReturnValue(null); // unsubscribe\RemoveSubscription
        sourceBroker.fakeReturnValue(null); // unsubscribe\RemoveSubscription

        strategy.subscribe(subscription);
        strategy.unsubscribe("0");

        // From .subscribe().
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "public information")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[0], "AddSubscription", subscription)).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[1], "AddSubscription", subscription)).toBeTruthy();

        // From .unsubscribe().
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "weather")).toBeTruthy();
        expect(sourceBroker.hasSent(sourceAddress, "Lookup", "public information")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[0], "RemoveSubscription", "0")).toBeTruthy();
        expect(sourceBroker.hasSent(responsiblePeerAddresses[1], "RemoveSubscription", "0")).toBeTruthy();
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

    it("The subscriber list has one subscription when receiving one AddSubscription message", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1387" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator);

        sourceBroker.raise("AddSubscription", subscription);

        expect(strategy.subscribers.length).toBe(1);
    });

    it("The subscriber list has two subscriptions when receiving two AddSubscription messages", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "42", "1337" ]);

        subscriptions.push(new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(sourceAddress, () => { }, [ "public information" ], () => true, fakeGenerator));

        sourceBroker.raise("AddSubscription", subscriptions[0]);
        sourceBroker.raise("AddSubscription", subscriptions[1]);

        expect(strategy.subscribers.length).toBe(2);
    });

    it("The subscriber list has no subscriptions when receiving one RemoveSubscription message for existing subscription", () =>
    {
        var fakeGenerator = new FakeGuidGenerator([ "1387" ]);
        var subscription = new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator);

        sourceBroker.raise("AddSubscription", subscription);
        sourceBroker.raise("RemoveSubscription", subscription.id);

        expect(strategy.subscribers.length).toBe(0);
    });

    it("The subscriber list has one subscription when receiving one RemoveSubscription message when having two subscriptions", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "42", "1337" ]);

        subscriptions.push(new Subscription(sourceAddress, () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(sourceAddress, () => { }, [ "public information" ], () => true, fakeGenerator));

        sourceBroker.raise("AddSubscription", subscriptions[0]);
        sourceBroker.raise("AddSubscription", subscriptions[1]);
        sourceBroker.raise("RemoveSubscription", subscriptions[0].id);

        expect(strategy.subscribers.length).toBe(1);
        expect(strategy.subscribers[0].id).toBe(subscriptions[1].id);
    });

    it("A subscriber list is sent to broker when receiving GetSubscriberList message with subscribers 8080 and 8081", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "public information" ], () => true, fakeGenerator));
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        sourceBroker.raise("AddSubscription", subscriptions[0]);
        sourceBroker.raise("AddSubscription", subscriptions[1]);
        var filteredSubscribers = sourceBroker.raise("GetSubscriberList", message);

        expect(filteredSubscribers).toEqual(subscriptions);
    });

    it("A subscriber list is sent to broker when receiving GetSubscriberList message with subscribers 8080, 8081 and 8082", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2", "3" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "public information" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "weather", "public information" ], () => true, fakeGenerator));
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        sourceBroker.raise("AddSubscription", subscriptions[0]);
        sourceBroker.raise("AddSubscription", subscriptions[1]);
        sourceBroker.raise("AddSubscription", subscriptions[2]);
        var filteredSubscribers = sourceBroker.raise("GetSubscriberList", message);

        expect(filteredSubscribers).toEqual(subscriptions);
    });

    it("The subscriber list is filtered by tags when subscriptions have exactly one tag", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2", "3" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "stocks" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "public information" ], () => true, fakeGenerator));
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        sourceBroker.raise("AddSubscription", subscriptions[0]);
        sourceBroker.raise("AddSubscription", subscriptions[1]);
        sourceBroker.raise("AddSubscription", subscriptions[2]);
        var filteredSubscribers = sourceBroker.raise("GetSubscriberList", message);

        expect(filteredSubscribers).toEqual([ subscriptions[0], subscriptions[2] ]);
    });

    it("The subscriber list is filtered by tags when subscriptions have at least one tag", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2", "3" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather", "stocks" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "stocks" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "weather", "public information" ], () => true, fakeGenerator));
        var message = new Message("C20, +0.2%", [ "stocks" ], fakeGenerator);

        sourceBroker.raise("AddSubscription", subscriptions[0]);
        sourceBroker.raise("AddSubscription", subscriptions[1]);
        sourceBroker.raise("AddSubscription", subscriptions[2]);
        var filteredSubscribers = sourceBroker.raise("GetSubscriberList", message);

        expect(filteredSubscribers).toEqual([ subscriptions[0], subscriptions[1] ]);
    });

    it("The subscriber list is filtered by filter function when message must be filtered out in one subscription", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2", "3" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], () => true, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "weather" ], () => false, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "weather" ], () => true, fakeGenerator));
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        sourceBroker.raise("AddSubscription", subscriptions[0]);
        sourceBroker.raise("AddSubscription", subscriptions[1]);
        sourceBroker.raise("AddSubscription", subscriptions[2]);
        var filteredSubscribers = sourceBroker.raise("GetSubscriberList", message);

        expect(filteredSubscribers).toEqual([ subscriptions[0], subscriptions[2] ]);
    });

    it("The subscriber list is filtered by filter function when message must be filtered out in two subscriptions", () =>
    {
        var subscriptions: Array<Subscription> = [ ];
        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2", "3" ]);

        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { }, [ "weather" ], m => m.contents === "snowy", fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { }, [ "weather" ], () => false, fakeGenerator));
        subscriptions.push(new Subscription(new Address("127.0.0.1", 8082), () => { }, [ "weather" ], () => true, fakeGenerator));
        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);

        sourceBroker.raise("AddSubscription", subscriptions[0]);
        sourceBroker.raise("AddSubscription", subscriptions[1]);
        sourceBroker.raise("AddSubscription", subscriptions[2]);
        var filteredSubscribers = sourceBroker.raise("GetSubscriberList", message);

        expect(filteredSubscribers).toEqual([ subscriptions[2] ]);
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