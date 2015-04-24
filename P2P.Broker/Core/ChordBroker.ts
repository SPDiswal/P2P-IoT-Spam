import IAddress = require("../../P2P/Interfaces/IAddress");
import IBroker = require("../Interfaces/IBroker");
import MessageType = require("../Enumerations/MessageType");

class RestChordBroker implements IBroker
{
    constructor(private address: IAddress)
    {
    }

    public send(message: MessageType, data: any): void { }

    public receive(callback: (type: MessageType, data: any) => void): void { }
}

export = RestChordBroker;