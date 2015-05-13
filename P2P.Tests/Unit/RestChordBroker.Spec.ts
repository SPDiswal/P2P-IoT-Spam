///// <reference path="../Scripts/typings/jasmine/jasmine.d.ts" />
//
//import Address = require("../../P2P/Core/Address");
//import RestChordBroker = require("../../P2P.Broker/Core/RestChordBroker");
//import FakeRequestDispatcher = require("../Fakes/FakeRequestDispatcher");
//import Helpers = require("../../P2P.Chord/Utilities/Helpers");
//import FakeGuidGenerator = require("../Fakes/FakeGuidGenerator");
//import Message = require("../../P2P/Core/Message");
//import Subscription = require("../../P2P/Core/Subscription");
//import IMessage = require("../../P2P/Interfaces/IMessage");
//
//// :::: TEST LIST ::::
//// DONE When handling an outgoing Join from strategy, it sends a /join/targetAddress HTTP request RESTfully to the Chord peer at the specified address.
//// DONE When handling an outgoing Lookup from strategy, it sends a /lookup/SHA1(tag) HTTP request RESTfully to the Chord peer at the specified address.
//
//// DONE When handling an outgoing RetrieveAllMessages from strategy, it sends a /all HTTP request RESTfully to the Chord peer at the specified address.
//// DONE When handling an outgoing Store from strategy, it sends a /store HTTP request with message RESTfully to the Chord peer at the specified address.
//// DONE When handling an outgoing Discard from strategy, it sends a /discard HTTP request RESTfully to the Chord peer at the specified address.
//
//// TODO When handling an outgoing Retrieve from strategy, it sends a /retrieve HTTP request RESTfully to the Chord peer at the specified address.
//// TODO When handling an outgoing Persist from strategy, it sends a /persist HTTP request RESTfully to the Chord peer at the specified address.
//// TODO When handling an outgoing Sweep from strategy, it sends a /sweep HTTP request RESTfully to the Chord peer at the specified address.
//// TODO When handling an outgoing Replicate from strategy, it sends a /replicate HTTP request RESTfully to the Chord peer at the specified address.
//// TODO When handling any other outgoing message from strategy, it sends an /action HTTP request RESTfully to the Chord peer at the specified address.
//
//// DONE When handling any other outgoing message from strategy, it sends a /message HTTP request RESTfully to the Chord peer at the specified address.
//// DONE When receiving an incoming message from the low-level network, it invokes the handle-callback of the strategy.
//// :::::::::::::::::::
//
////describe("RestChordBroker", () =>
////{
////    var sourceAddresses: Array<Address>, fakeDispatcher: FakeRequestDispatcher, broker: RestChordBroker;
////
////    beforeEach(() =>
////    {
////        sourceAddresses = [ new Address("127.0.0.1", 8080), new Address("127.0.0.1", 8083) ];
////        fakeDispatcher = new FakeRequestDispatcher();
////        broker = new RestChordBroker(sourceAddresses[0], fakeDispatcher);
////    });
////
////    it("When handling an outgoing Join(127.0.0.1:8081) from strategy, it sends a POST /join/127.0.0.1:8081 HTTP request RESTfully to the Chord peer at 127.0.0.1:8080.", () =>
////    {
////        var targetAddress = new Address("127.0.0.1", 8081);
////        broker.sendFromStrategy(sourceAddresses[0], "Join", targetAddress);
////
////        expect(fakeDispatcher.hasSentPost("127.0.0.1:8080/join/127.0.0.1:8081")).toBeTruthy();
////    });
////
////    it("When handling an outgoing Join(127.0.0.1:8082) from strategy, it sends a POST /join/127.0.0.1:8082 HTTP request RESTfully to the Chord peer at 127.0.0.1:8083.", () =>
////    {
////        var targetAddress = new Address("127.0.0.1", 8082);
////        broker.sendFromStrategy(sourceAddresses[1], "Join", targetAddress);
////
////        expect(fakeDispatcher.hasSentPost("127.0.0.1:8083/join/127.0.0.1:8082")).toBeTruthy();
////    });
////
////    it("When handling an outgoing Lookup('weather') from strategy, it sends a GET /lookup/SHA1('weather') HTTP request RESTfully to the Chord peer at 127.0.0.1:8080.", () =>
////    {
////        var tag = "weather";
////        broker.sendFromStrategy(sourceAddresses[0], "Lookup", tag);
////
////        expect(fakeDispatcher.hasSentGet("127.0.0.1:8080/lookup/" + Helpers.hash(tag))).toBeTruthy();
////    });
////
////    it("When handling an outgoing Lookup('public information') from strategy, it sends a GET /lookup/SHA1('public information') HTTP request RESTfully to the Chord peer at 127.0.0.1:8083.", () =>
////    {
////        var tag = "public information";
////        broker.sendFromStrategy(sourceAddresses[1], "Lookup", tag);
////
////        expect(fakeDispatcher.hasSentGet("127.0.0.1:8083/lookup/" + Helpers.hash(tag))).toBeTruthy();
////    });
////
////    it("When handling an outgoing RetrieveAllMessages('weather') from strategy, it sends a GET /all/weather HTTP request RESTfully to the Chord peer at 127.0.0.1:8080.", () =>
////    {
////        var tag = "weather";
////        broker.sendFromStrategy(sourceAddresses[0], "RetrieveAllMessages", tag);
////
////        expect(fakeDispatcher.hasSentGet("127.0.0.1:8080/messages/" + tag)).toBeTruthy();
////    });
////
////    it("When handling an outgoing RetrieveAllMessages('public information') from strategy, it sends a GET /all/public information HTTP request RESTfully to the Chord peer at 127.0.0.1:8083.", () =>
////    {
////        var tag = "public information";
////        broker.sendFromStrategy(sourceAddresses[1], "RetrieveAllMessages", tag);
////
////        expect(fakeDispatcher.hasSentGet("127.0.0.1:8083/messages/" + tag)).toBeTruthy();
////    });
////
////    it("When handling an outgoing Store from strategy, it sends a PUT /store HTTP request with sunny-message RESTfully to the Chord peer at 127.0.0.1:8080.", () =>
////    {
////        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
////        var message = new Message("sunny", [ "weather" ], fakeGenerator);
////
////        broker.sendFromStrategy(sourceAddresses[0], "Store", message);
////
////        expect(fakeDispatcher.hasSentPut("127.0.0.1:8080/messages", JSON.stringify(message))).toBeTruthy();
////    });
////
////    it("When handling an outgoing Store from strategy, it sends a PUT /store HTTP request with rainy-message RESTfully to the Chord peer at 127.0.0.1:8083.", () =>
////    {
////        var fakeGenerator = new FakeGuidGenerator([ "1387" ]);
////        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);
////
////        broker.sendFromStrategy(sourceAddresses[1], "Store", message);
////
////        expect(fakeDispatcher.hasSentPut("127.0.0.1:8083/messages", JSON.stringify(message))).toBeTruthy();
////    });
////
////    it("When handling an outgoing Discard from strategy, it sends a DELETE /discard HTTP request RESTfully to the Chord peer at 127.0.0.1:8080.", () =>
////    {
////        broker.sendFromStrategy(sourceAddresses[0], "Discard", "");
////
////        expect(fakeDispatcher.hasSentDelete("127.0.0.1:8080/messages")).toBeTruthy();
////    });
////
////    it("When handling an outgoing Discard from strategy, it sends a DELETE /discard HTTP request RESTfully to the Chord peer at 127.0.0.1:8083.", () =>
////    {
////        broker.sendFromStrategy(sourceAddresses[1], "Discard", "");
////
////        expect(fakeDispatcher.hasSentDelete("127.0.0.1:8083/messages")).toBeTruthy();
////    });
////
////    it("When handling an outgoing AddSubscription from strategy, it sends a PUT /message with custom data HTTP request RESTfully to the Chord peer at 127.0.0.1:8080.", () =>
////    {
////        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
////        var subscription = new Subscription(sourceAddresses[0], () => { }, [ "weather" ], () => true, fakeGenerator);
////
////        broker.sendFromStrategy(sourceAddresses[0], "AddSubscription", subscription);
////
////        expect(fakeDispatcher.hasSentPut("127.0.0.1:8080/message", JSON.stringify(subscription))).toBeTruthy();
////    });
////
////    it("When handling an outgoing AddSubscription from strategy, it sends a PUT /message with custom data HTTP request RESTfully to the Chord peer at 127.0.0.1:8083.", () =>
////    {
////        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
////        var subscription = new Subscription(sourceAddresses[1], () => { }, [ "weather", "public information" ], (s: IMessage) => s.contents.precipitation > 50 && s.contents.temperature < 10, fakeGenerator);
////
////        broker.sendFromStrategy(sourceAddresses[1], "AddSubscription", subscription);
////
////        expect(fakeDispatcher.hasSentPut("127.0.0.1:8083/message", JSON.stringify(subscription))).toBeTruthy();
////    });
////
////    it("When handling an outgoing RemoveSubscription from strategy, it sends a DELETE /message with custom data HTTP request RESTfully to the Chord peer at 127.0.0.1:8080.", () =>
////    {
////        broker.sendFromStrategy(sourceAddresses[0], "RemoveSubscription", "0");
////
////        expect(fakeDispatcher.hasSentDelete("127.0.0.1:8080/message", JSON.stringify("0"))).toBeTruthy();
////    });
////
////    it("When handling an outgoing RemoveSubscription from strategy, it sends a DELETE /message with custom data HTTP request RESTfully to the Chord peer at 127.0.0.1:8083.", () =>
////    {
////        broker.sendFromStrategy(sourceAddresses[1], "RemoveSubscription", "42");
////
////        expect(fakeDispatcher.hasSentDelete("127.0.0.1:8083/message", JSON.stringify("42"))).toBeTruthy();
////    });
////
////    it("When handling an outgoing GetSubscriberList from strategy, it sends a GET /message with custom data HTTP request RESTfully to the Chord peer at 127.0.0.1:8080.", () =>
////    {
////        var fakeGenerator = new FakeGuidGenerator([ "0" ]);
////        var message = new Message("sunny", [ "weather" ], fakeGenerator);
////
////        broker.sendFromStrategy(sourceAddresses[0], "GetSubscriberList", message);
////
////        expect(fakeDispatcher.hasSentGet("127.0.0.1:8080/message", JSON.stringify(message))).toBeTruthy();
////    });
////
////    it("When handling an outgoing GetSubscriberList from strategy, it sends a GET /message with custom data HTTP request RESTfully to the Chord peer at 127.0.0.1:8083.", () =>
////    {
////        var fakeGenerator = new FakeGuidGenerator([ "1387" ]);
////        var message = new Message("rainy", [ "weather", "public information" ], fakeGenerator);
////
////        broker.sendFromStrategy(sourceAddresses[1], "GetSubscriberList", message);
////
////        expect(fakeDispatcher.hasSentGet("127.0.0.1:8083/message", JSON.stringify(message))).toBeTruthy();
////    });
////
////    it("When handling an outgoing CreateSubscription from strategy, it sends a POST /message with custom data HTTP request RESTfully to the Chord peer at 127.0.0.1:8080.", () =>
////    {
////        broker.sendFromStrategy(sourceAddresses[0], "CreateSubscription", "0");
////
////        expect(fakeDispatcher.hasSentPost("127.0.0.1:8080/message", JSON.stringify("0"))).toBeTruthy();
////    });
////
////    it("When handling an outgoing CreateSubscription from strategy, it sends a POST /message with custom data HTTP request RESTfully to the Chord peer at 127.0.0.1:8083.", () =>
////    {
////        broker.sendFromStrategy(sourceAddresses[1], "CreateSubscription", "42");
////
////        expect(fakeDispatcher.hasSentPost("127.0.0.1:8083/message", JSON.stringify("42"))).toBeTruthy();
////    });
////
////    //    it("When receiving an incoming message from the low-level network, it invokes the handle-callback of the strategy.", () =>
////    //    {
////    //        var incomingMessage: string;
////    //        var incomingData: any;
////    //
////    //        broker.handleToStrategy((message: string, data: any) =>
////    //        {
////    //            incomingMessage = message;
////    //            incomingData = data;
////    //            return 42;
////    //        });
////    //        var result = broker.handleFromNetwork("Hello World", JSON.stringify("I Can Has Cheezburger?"));
////    //
////    //        expect(result).toBe(42);
////    //        expect(incomingMessage).toBe("Hello World");
////    //        expect(incomingData).toBe("I Can Has Cheezburger?");
////    //    });
////
////    it("When receiving an incoming message from the low-level network, it does invoke handle-callback when there is no callback registered.", () =>
////    {
////        var result = broker.handleFromNetwork("Hello World", JSON.stringify("I Can Has Cheezburger?"));
////        expect(result).toBe(null);
////    });
////
////    //    it("When receiving an two incoming messages from the low-level network, it invokes the handle-callback of the strategy two times.", () =>
////    //    {
////    //        var incomingMessages = <Array<string>>[ ];
////    //        var incomingData = <Array<any>>[ ];
////    //        var invocations = 0;
////    //
////    //        broker.handleToStrategy((message: string, data: any) =>
////    //        {
////    //            incomingMessages.push(message);
////    //            incomingData.push(data);
////    //            invocations++;
////    //            return 1335 + invocations;
////    //        });
////    //
////    //        var firstResult = broker.handleFromNetwork("Hello World", JSON.stringify([ "I Can Has Cheezburger?", "Plzz" ]));
////    //        var secondResult = broker.handleFromNetwork("If I Can't Haz A Cheeseburger", JSON.stringify("I Settlz Forz A Toona Sammich!"));
////    //
////    //        expect(invocations).toBe(2);
////    //        expect(firstResult).toBe(1336);
////    //        expect(secondResult).toBe(1337);
////    //        expect(incomingMessages[0]).toBe("Hello World");
////    //        expect(incomingData[0]).toEqual([ "I Can Has Cheezburger?", "Plzz" ]);
////    //        expect(incomingMessages[1]).toBe("If I Can't Haz A Cheeseburger");
////    //        expect(incomingData[1]).toBe("I Settlz Forz A Toona Sammich!");
////    //    });
////});