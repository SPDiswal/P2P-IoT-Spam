import Express = require("express");
import Application = Express.Application;
import Q = require("q");
import Promise = Q.Promise;

import IBroker = require("../Brokers/IBroker");
import IFilterEvaluator = require("../Filters/IFilterEvaluator");
import IFilterParser = require("../Filters/IFilterParser");
import IFramework = require("./IBottleneckFramework");
import IGuidGenerator = require("../Guids/IGuidGenerator");
import IRouter = require("../Routers/IRouter");

import Address = require("../Common/Address");
import FilterParser = require("../Filters/FilterParser");
import GuidGenerator = require("../Guids/GuidGenerator");
import LocalChordPeer = require("../../P2P.Chord/Core/LocalChordPeer");
import Message = require("../Common/Message");
import RequestDispatcher = require("../Http/RequestDispatcher");
import RestChordBroker = require("../Brokers/RestChordBroker");
import SpanningTreeRouter = require("../Routers/SpanningTree/SpanningTreeRouter");
import SubscriberListRouter = require("../Routers/SubscriberList/SubscriberListRouter");
import Subscription = require("../Common/Subscription");

class Bottleneck implements IFramework
{
    private chord: LocalChordPeer;
    private guidGenerator: IGuidGenerator = new GuidGenerator();
    private parser: IFilterParser = new FilterParser();

    private address: Address;
    private isRunning = false;

    private isLoggingChord = false;

    constructor(app: Application, host: string, port: number, endpoint: string = "bottleneck", private router: IRouter = null, private broker: IBroker = null, private stabiliseInterval = 1000)
    {
        if (endpoint.length > 0 && endpoint[0] !== "/") endpoint = "/" + endpoint;
        this.address = Address.fromHostPort(host, port);

        if (this.broker === null) this.broker = new RestChordBroker(endpoint, new RequestDispatcher());
        if (this.router === null) this.router = new SubscriberListRouter(this.address, this.broker);

        this.chord = new LocalChordPeer(app, this.broker, host + ":" + port, endpoint, this.isLoggingChord);
    }

    public publish(tags: Array<string>, contents: any): Promise<boolean>
    {
        return this.guard(() => this.router.publish(new Message(contents, tags, this.guidGenerator)));
    }

    public subscribe(tags: Array<string>, callback: (tags: Array<string>, contents: any) => void, retrieveOldMessages: boolean = false): Promise<string>
    {
        return this.subscribeToContents(tags, () => true, callback, retrieveOldMessages);
    }

    public subscribeToContents(tags: Array<string>, filter: (tags: Array<string>, contents: any) => boolean, callback: (tags: Array<string>, contents: any) => void, retrieveOldMessages: boolean = false): Promise<string>
    {
        return this.guard(() =>
        {
            var deferred = Q.defer<string>();
            var subscription = new Subscription(this.address, tags, this.parser.parse(filter), (m: Message) => callback(m.tags, m.contents), this.guidGenerator);

            this.router.subscribe(subscription, retrieveOldMessages)
                .then(r =>
                {
                    if (r) deferred.resolve(subscription.id);
                    else deferred.reject("Failed to subscribe to " + subscription.id);
                });

            return deferred.promise;
        });
    }

    public unsubscribe(id: string): Promise<boolean>
    {
        return this.guard(() => this.router.unsubscribe(id));
    }

    public join(domainHost: string, domainPort: number): Promise<boolean>
    {
        return this.guard(() => this.router.join(Address.fromHostPort(domainHost, domainPort)));
    }

    public run(): void
    {
        this.chord.run(this.stabiliseInterval);
        this.isRunning = true;
    }

    private guard<T>(action: () => T): T
    {
        if (this.isRunning) return action();
        else throw new Error("The framework is not running.");
    }
}

export = Bottleneck;