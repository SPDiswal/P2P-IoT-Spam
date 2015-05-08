/// <reference path="../Scripts/typings/jasmine/jasmine.d.ts" />

import Address = require("../../P2P/Core/Address");
import SubscriberListRoutingStrategy = require("../../P2P/Strategies/SubscriberListRoutingStrategy");
import FakeGuidGenerator = require("../Fakes/FakeGuidGenerator");
import Message = require("../../P2P/Core/Message");
import MessageType = require("../../P2P.Broker/Enumerations/MessageType");
import Subscription = require("../../P2P/Core/Subscription");
import IAddress = require("../../P2P/Interfaces/IAddress");

// :::: TEST LIST ::::
// TODO When handling an outgoing Join from strategy, it sends a /join/targetAddress HTTP request RESTfully to the Chord peer at the specified address.
// TODO When handling an outgoing Lookup from strategy, it sends a /lookup/SHA1(tag) HTTP request RESTfully to the Chord peer at the specified address.
// TODO When handling an outgoing RetrieveAllMessages from strategy, it sends a /all HTTP request RESTfully to the Chord peer at the specified address.
// TODO When handling any other outgoing message from strategy, it sends a /message HTTP request RESTfully to the Chord peer at the specified address.
// TODO When handling an outgoing Store from strategy, it sends a /store HTTP request RESTfully to the Chord peer at the specified address.
// TODO When handling an outgoing Discard from strategy, it sends a /discard HTTP request RESTfully to the Chord peer at the specified address.
// TODO When receiving an incoming message from the low-level network, it invokes the handle-callback of the strategy.
// :::::::::::::::::::

it("When handling an outgoing Join from strategy, it sends a /join/targetAddress HTTP request RESTfully to the Chord peer at the specified address.", () =>
{

});