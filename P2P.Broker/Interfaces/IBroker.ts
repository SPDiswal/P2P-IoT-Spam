import IAddress = require("../../P2P/Interfaces/IAddress");

interface IBroker
{
    // Outgoing messages from routing strategy to low-level network (e.g. Chord peer) via IBroker.
    // Called by routing strategy, may expect return value from broker (delivered by low-level network).
    sendFromStrategy(destination: IAddress, message: string, data: any): any;

    // For example:
    // .send(self address, "lookup", "tag") -> address of responsible peer
    // .send(address of responsible peer, "message", {...data...}) -> void

    // Incoming messages from broker to routing strategy.
    // Called by routing strategy to register callback.
    // Single callback invoked by broker on routing strategy to handle message and produce return value.
    handleToStrategy(callback: (message: string, data: any) => any): void;

    // Incoming messages from low-level network (e.g. Chord peer) to broker to be passed on to routing strategy.
    // Called by low-level network, may expect return value from broker (delivered by routing strategy).
    handleFromNetwork(message: string, data: any): any;
}

export = IBroker;