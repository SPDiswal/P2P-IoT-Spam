import IAddress = require("../../P2P/Interfaces/IAddress");
import IBroker = require("../Interfaces/IBroker");

class RestChordBroker implements IBroker
{
    constructor(private address: IAddress)
    {
    }

    public sendFromStrategy(destination: IAddress, message: string, data: any): any { }

    public handleToStrategy(callback: (message: string, data: any) => any): any { }

    public handleFromNetwork(message: string, data: any): any { }
}

export = RestChordBroker;