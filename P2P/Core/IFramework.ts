﻿interface IFramework
{
    publish(tags: Array<string>, contents: any): void;
    subscribe(tags: Array<string>, callback: (tags: Array<string>, contents: any) => void, retrieveOldMessages?: boolean): string;
    subscribeToContents(tags: Array<string>, filter: string, callback: (tags: Array<string>, contents: any) => void, retrieveOldMessages?: boolean): string;
    unsubscribe(id: string): void;
    join(domainHost: string, domainPort: number): void;
    run(host: string, port: number): void; // Starts a Chord peer node on the address.

    // TODO: Watch out for malicious filter functions in .subscribe().
    // TODO: Ensure that host and port in .run() are 'valid' (i.e. this computer, not a random other computer)
}

export = IFramework;