import IAddress = require("../../P2P/Interfaces/IAddress");
import IBroker = require("../Interfaces/IBroker");

class RestChordBroker implements IBroker
{
    // TODO Extend the RestChordBroker with logging capabilities so that we can measure network traffic.

    constructor(private address: IAddress)
    {
    }

    public sendFromStrategy(destination: IAddress, message: string, data: any): any
    {
        // TODO Determine message type and forward to Chord peer.
    }

    public handleToStrategy(callback: (message: string, data: any) => any): any
    {
        // TODO Register callback.
    }

    public handleFromNetwork(message: string, data: any): any
    {
        // TODO Forward to routing strategy.
    }
}

export = RestChordBroker;