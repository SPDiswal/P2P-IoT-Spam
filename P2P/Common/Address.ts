class Address
{
    private host: string;
    private port: number;

    public static fromHostPort(host: string, port: number): Address
    {
        var address = new Address();
        address.host = host;
        address.port = port;
        return address;
    }

    public static from(addressString: string): Address
    {
        var host = addressString.substring(0, addressString.indexOf(":"));
        var port = parseInt(addressString.substring(addressString.indexOf(":") + 1));
        return this.fromHostPort(host, port);
    }

    public equals(that: Address): boolean
    {
        if (!that) return false;
        return this.host === that.host && this.port === that.port;
    }

    public toString(): string
    {
        return this.host + ":" + this.port;
    }

    public static deserialise(input: any): Address
    {
        var address = new Address();
        address.host = input.host;
        address.port = input.port;
        return address;
    }
}

export = Address;