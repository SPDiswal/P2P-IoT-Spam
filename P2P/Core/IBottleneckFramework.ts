import Q = require("q");
import Promise = Q.Promise;

interface IBottleneckFramework
{
    publish(tags: Array<string>, contents: any): Promise<boolean>;
    subscribe(tags: Array<string>, callback: (tags: Array<string>, contents: any) => void, retrieveOldMessages?: boolean): Promise<string>;
    subscribeToContents(tags: Array<string>, filter: (tags: Array<string>, contents: any) => boolean, callback: (tags: Array<string>, contents: any) => void, retrieveOldMessages?: boolean): Promise<string>;
    unsubscribe(id: string): Promise<boolean>;
    join(domainHost: string, domainPort: number): Promise<boolean>;
    run(host: string, port: number): void; // Starts a Chord peer node on the address.

    // TODO: Watch out for malicious filter functions in .subscribe().
    // TODO: Ensure that host and port in .run() are 'valid' (i.e. this computer, not a random other computer)
}

export = IBottleneckFramework;