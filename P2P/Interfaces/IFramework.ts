interface IFramework
{
    publish<TContents>(tags: Array<string>, contents: TContents): void;
    subscribe<TContents>(tags: Array<string>, filter: (contents: TContents, tags: Array<string>) => boolean, callback: (contents: TContents, tags: Array<string>) => void): string;
    unsubscribe(id: string): void;
    join(domainHost: string, domainPort: number): void;
    run(host: string, port: number): void; // Starts a Chord peer node on the address.

    // TODO: Register content interfaces (TContents).
    // TODO: Validate data according to JSON Schema (a.k.a. TContents)
    // TODO: Watch out for malicious filter functions in .subscribe().
}

export = IFramework;