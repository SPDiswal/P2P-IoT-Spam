import Q = require("q");
import Promise = Q.Promise;

import Address = require("../Common/Address");

interface IBroker
{
    // Outgoing messages from router to low-level network (e.g. Chord peer) via IBroker.
    // Called by router, may expect return value from broker (delivered by low-level network).
    // Remember to hash before lookup.
    send(destination: Address, message: string, data: any): Promise<any>;
    
    // For example:
    // .send(self address, "lookup", "tag") -> address of responsible peer
    // .send(address of responsible peer, "message", {...data...}) -> void

    // Incoming messages from broker to router.
    // Called by router to register callback.
    // Single callback invoked by broker on router to handle message and produce return value.
    incoming(callback: (message: string, data: any) => Promise<any>): void;

    // Incoming messages from low-level network (e.g. Chord peer) to broker to be passed on to router.
    // Called by low-level network, may expect return value from broker (delivered by router).
    delegate(message: string, data: any): Promise<any>;
}

export = IBroker;