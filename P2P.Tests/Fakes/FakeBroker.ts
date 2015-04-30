import ArrayUtilities = require("../../P2P/Utilities/ArrayUtilities");
import IAddress = require("../../P2P/Interfaces/IAddress");
import IBroker = require("../../P2P.Broker/Interfaces/IBroker");

class FakeBroker implements IBroker
{
    private message: string;
    private data: any;
    private callback: (message: string, data: any) => any;

    constructor(private address: IAddress)
    {
    }

    public sendFromStrategy(destination: IAddress, message: string, data: any): any
    {
        this.message = message;
        this.data = data;
    }

    public handleToStrategy(callback: (message: string, data: any) => any): void
    {
        this.callback = callback;
    }

    public handleFromNetwork(message: string, data: any): any
    {
    }

    public hasSent(message: string, data: any): boolean
    {
        if (data instanceof Array)
            return message === this.message && ArrayUtilities.equals(data, this.data);
        else if (data.hasOwnProperty("equals"))
            return message === this.message && data.equals(this.data);
        else
            return message === this.message && data === this.data;
    }

    public raise(message: string, data: any): any
    {
        if (this.callback !== null)
            return this.callback(message, data);
        return null;
    }
}

export = FakeBroker;