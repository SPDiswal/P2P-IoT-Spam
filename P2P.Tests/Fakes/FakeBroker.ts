//import Q = require("q");
//import Promise = Q.Promise;
//
//import IBroker = require("../../P2P.Broker/Interfaces/IBroker");
//
//import Address = require("../../P2P/Core/Address");
//import ArrayUtilities = require("../../P2P/Utilities/ArrayUtilities");
//
//class FakeBroker implements IBroker
//{
//    private destinations: Array<string> = [ ];
//    private messages: Array<string> = [ ];
//    private data: Array<any> = <Array<any>>[ ];
//    private fakeReturnValues: Array<any> = <Array<any>>[ ];
//    private callback: (message: string, data: any) => any;
//
//    constructor(private address: Address)
//    {
//    }
//
//    public sendFromStrategy(destination: string, message: string, data: any): Promise<any>
//    {
//        this.destinations.push(destination);
//        this.messages.push(message);
//        this.data.push(data);
//
//        if (this.fakeReturnValues.length > 0)
//            return this.fakeReturnValues.shift();
//
//        return null;
//    }
//
//    public handleToStrategy(callback: (message: string, data: any) => Promise<any>): void
//    {
//        this.callback = callback;
//    }
//
//    public handleFromNetwork(message: string, data: string): Promise<string>
//    {
//        return null;
//    }
//
//    public hasSent(destination: string, message: string, data: any): boolean
//    {
//        var foremostDestination = this.destinations.shift();
//        var foremostMessage = this.messages.shift();
//        var foremostData = this.data.shift();
//
//        if (data instanceof Array)
//            return message === foremostMessage && ArrayUtilities.equals(data, foremostData) && destination === foremostDestination;
//        else if (data.hasOwnProperty("equals"))
//            return message === foremostMessage && data.equals(foremostData) && destination === foremostDestination;
//        else
//            return message === foremostMessage && data === foremostData && destination === foremostDestination;
//    }
//
//    public fakeReturnValue(value: any)
//    {
//        this.fakeReturnValues.push(value);
//    }
//
//    public raise(message: string, data: any): any
//    {
//        if (this.callback !== null)
//            return this.callback(message, data);
//        return null;
//    }
//}
//
//export = FakeBroker;