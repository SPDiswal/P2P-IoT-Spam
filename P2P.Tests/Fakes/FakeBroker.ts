﻿import ArrayUtilities = require("../../P2P/Utilities/ArrayUtilities");
import IAddress = require("../../P2P/Interfaces/IAddress");
import IBroker = require("../../P2P.Broker/Interfaces/IBroker");
import MessageType = require("../../P2P.Broker/Enumerations/MessageType");

class FakeBroker implements IBroker
{
    private message: MessageType;
    private data: any;

    private callbacks: Array<(type: MessageType, data: any) => void> = [ ];

    constructor(private address: IAddress)
    {
    }

    public send(message: MessageType, data: any): void
    {
        this.message = message;
        this.data = data;
    }

    public receive(callback: (type: MessageType, data: any) => void): void
    {
        this.callbacks.push(callback);
    }

    public hasSent(message: MessageType, data: any): boolean
    {
        if (data instanceof Array)
            return message === this.message && ArrayUtilities.equals(data, this.data);
        else if (data.hasOwnProperty("equals"))
            return message === this.message && data.equals(this.data);
        else
            return message === this.message && data === this.data;
    }

    public raise(message: MessageType, data: any): void
    {
        this.callbacks.forEach((callback: (m: MessageType, d: any) => void) =>
        {
            callback(message, data);
        });
    }
}

export = FakeBroker;