import IAddress = require("../../P2P/Interfaces/IAddress");
import IBroker = require("../Interfaces/IBroker");
import IRequestDispatcher = require("../../P2P.Chord/Interfaces/IRequestDispatcher");
import Helpers = require("../../P2P.Chord/Utilities/Helpers");
import IMessage = require("../../P2P/Interfaces/IMessage");

class RestChordBroker implements IBroker
{
    // TODO Extend the RestChordBroker with logging capabilities so that we can measure network traffic.

    private callback: (message: string, data: any) => any = null;

    constructor(private address: IAddress, private request: IRequestDispatcher)
    {
    }

    public sendFromStrategy(destination: IAddress, message: string, data: any): any
    {
        switch (message)
        {
            case "Join":
                this.request.post(destination.host + ":" + destination.port + "/join/" + <IAddress>data.host + ":" + <IAddress>data.port);
                break;

            case "Lookup":
                this.request.get(destination.host + ":" + destination.port + "/lookup/" + Helpers.hash(<string>data));
                break;

            case "RetrieveAllMessages":
                this.request.get(destination.host + ":" + destination.port + "/all/" + <string>data);
                break;

            case "Store":
                this.request.put(destination.host + ":" + destination.port + "/store", JSON.stringify(<IMessage>data));
                break;

            case "Discard":
                this.request.delete(destination.host + ":" + destination.port + "/discard");
                break;

            default:
                var url = destination.host + ":" + destination.port + "/message";
                var serialisedData = JSON.stringify(data);

                if (message.lastIndexOf("Get", 0) === 0) this.request.get(url, serialisedData);
                else if (message.lastIndexOf("Create", 0) === 0) this.request.post(url, serialisedData);
                else if (message.lastIndexOf("Add", 0) === 0) this.request.put(url, serialisedData);
                else this.request.delete(url, serialisedData);

                break;
        }
    }

    public handleToStrategy(callback: (message: string, data: any) => any): any
    {
        this.callback = callback;
    }

    public handleFromNetwork(message: string, data: any): any
    {
        if (this.callback !== null)
            return this.callback(message, JSON.parse(data));

        return null;
    }
}

export = RestChordBroker;