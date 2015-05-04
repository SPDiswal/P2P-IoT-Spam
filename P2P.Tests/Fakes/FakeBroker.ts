import ArrayUtilities = require("../../P2P/Utilities/ArrayUtilities");
import IBroker = require("../../P2P.Broker/Interfaces/IBroker");
import Address = require("../../P2P/Core/Address");

class FakeBroker implements IBroker
{
    private destinations: Array<Address> = [ ];
    private messages: Array<string> = [ ];
    private data: Array<any> = <Array<any>>[ ];
    private fakeReturnValues: Array<any> = <Array<any>>[ ];
    private callback: (message: string, data: any) => any;

    constructor(private address: Address)
    {
    }

    public sendFromStrategy(destination: Address, message: string, data: any): any
    {
        this.destinations.push(destination);
        this.messages.push(message);
        this.data.push(data);

        if (this.fakeReturnValues.length > 0)
            return this.fakeReturnValues.shift();

        return null;
    }

    public handleToStrategy(callback: (message: string, data: any) => any): void
    {
        this.callback = callback;
    }

    public handleFromNetwork(message: string, data: any): any
    {
    }

    public hasSent(destination: Address, message: string, data: any): boolean
    {
        var foremostDestination = this.destinations.shift();
        var foremostMessage = this.messages.shift();
        var foremostData = this.data.shift();

        if (data instanceof Array)
            return message === foremostMessage && ArrayUtilities.equals(data, foremostData) && destination.equals(foremostDestination);
        else if (data.hasOwnProperty("equals"))
            return message === foremostMessage && data.equals(foremostData) && destination.equals(foremostDestination);
        else
            return message === foremostMessage && data === foremostData && destination.equals(foremostDestination);
    }

    public fakeReturnValue(value: any)
    {
        this.fakeReturnValues.push(value);
    }

    public raise(message: string, data: any): any
    {
        if (this.callback !== null)
            return this.callback(message, data);
        return null;
    }
}

export = FakeBroker;