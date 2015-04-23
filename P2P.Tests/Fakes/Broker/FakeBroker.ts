import IAddress = require("../../../P2P/Interfaces/IAddress");
import IBroker = require("../../../P2P.Broker/Interfaces/IBroker");
import MessageType = require("../../../P2P.Broker/Enumerations/MessageType");

class FakeBroker implements IBroker
{
    private message: MessageType;
    private data: any;

    constructor(private address: IAddress)
    {
    }

    public send(message: MessageType, data: any): void
    {
        this.message = message;
        this.data = data;
    }

    public receive(callback: (type: MessageType, data: any) => void): void { }

    public hasSent(message: MessageType, data: any): boolean
    {
        return this.message === message && this.data.equals(data);
    }
}

export = FakeBroker;