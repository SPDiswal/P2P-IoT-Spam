import IAddress = require("../Interfaces/IAddress");

class Address implements IAddress
{
    constructor(private _host: string, private _port: number)
    {
    }

    public get host(): string
    {
        return this._host;
    }

    public get port(): number
    {
        return this._port;
    }

    public equals(that: Address): boolean
    {
        return this.host === that.host && this.port === that.port;
    }
}

export = Address;