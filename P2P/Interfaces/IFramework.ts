interface IFramework
{
    publish(tags: Array<string>, contents: any): void;
    subscribe(tags: Array<string>, filter: (contents: any, tags: Array<string>) => boolean, callback: (contents: any, tags: Array<string>) => void, retrieveOldMessages?: boolean): string;
    unsubscribe(id: string): void;
    join(domainHost: string, domainPort: number): void;
    run(host: string, port: number): void; // Starts a Chord peer node on the address.

    // TODO: Register content interfaces (TContents).
    // TODO: Validate data according to JSON Schema (a.k.a. TContents)
    // TODO: Watch out for malicious filter functions in .subscribe().
    // TODO: Ensure that host and port in .run() are 'valid' (i.e. this computer, not a random other computer)
}

export = IFramework;