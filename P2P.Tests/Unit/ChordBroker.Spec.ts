/// <reference path="../Scripts/typings/jasmine/jasmine.d.ts" />

import Address = require("../../P2P/Core/Address");
import SubscriberListRoutingStrategy = require("../../P2P/Strategies/SubscriberListRoutingStrategy");
import FakeGuidGenerator = require("../Fakes/FakeGuidGenerator");
import Message = require("../../P2P/Core/Message");
import MessageType = require("../../P2P.Broker/Enumerations/MessageType");
import Subscription = require("../../P2P/Core/Subscription");
import IAddress = require("../../P2P/Interfaces/IAddress");

// :::: TEST LIST ::::
// TODO When sending Join, it sends a /join/targetAddress HTTP request.
// TODO When sending Publish, it sends a /lookup/hash(tag) HTTP request per message tag to retrieve peers responsible for subscriber lists.
// TODO When sending Publish, it sends a /subscribers HTTP request to each responsible peer to retrieve subscriber lists.
// TODO When sending Publish, it sends a /message HTTP request to each subscriber.
// TODO When sending Subscribe, it sends a /lookup/hash(tag) HTTP request per subscription tag to retrieve peers responsible for subscriber lists.
// TODO When sending Subscribe, it sends a /subscription HTTP request to each responsible peer to update their subscriber lists.
// TODO When sending Unsubscribe, it sends a /lookup/hash(tag) HTTP request per subscription tag to retrieve peers responsible for subscriber lists.
// TODO When sending Unsubscribe, it sends a /unsubscription HTTP request to each responsible peer to update their subscriber lists.

// TODO When Chord peer receives HTTP request at /message, 


// TODO When receiving Subscribers, it invokes callback from RoutingStrategy to get filtered subscriber list.



// TODO When unsubscribed, the peer does not receive any messages that match the old subscription.

// TODO When receiving Message,
// TODO When receiving Subscription,
// TODO When receiving Unsubscription,

// TODO When sending RetrieveAllMessages, it sends a /... HTTP request to ... to retrieve all published messages.

// TODO Published messages must be stored in the system.
// TODO Published messages are discarded after exceeding their lifetime.
// :::::::::::::::::::

//    it("When unsubscribed, the peer does not receive any messages that match the old subscription", () =>
//    {
//        var invocations = [ 0, 0 ];
//        var subscriptions: Array<Subscription> = [ ];
//        var messages: Array<Message> = [ ];
//
//        var fakeGenerator = new FakeGuidGenerator([ "0", "1", "2" ]);
//
//        subscriptions.push(new Subscription(new Address("127.0.0.1", 8080), () => { invocations[0]++; }, [ "weather" ], () => true, fakeGenerator));
//        subscriptions.push(new Subscription(new Address("127.0.0.1", 8081), () => { invocations[1]++; }, [ "public information" ], () => true, fakeGenerator));
//
//        messages.push(new Message("rainy", [ "weather", "public information" ], fakeGenerator));
//        messages.push(new Message("snowy", [ "weather", "public information" ], fakeGenerator));
//
//        strategy.subscribe(subscriptions[0]);
//        strategy.subscribe(subscriptions[1]);
//        sourceBroker.raise(MessageType.Message, messages[0]);
//
//        strategy.unsubscribe(subscriptions[0].id);
//        sourceBroker.raise(MessageType.Message, messages[1]);
//
//        expect(invocations[0]).toBe(1);
//        expect(invocations[1]).toBe(2);
//    });