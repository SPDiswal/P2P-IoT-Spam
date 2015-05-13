import Express = require("express");
import Application = Express.Application;

import IBroker = require("../Brokers/IBroker");
import IFramework = require("./IFramework");
import IGuidGenerator = require("../Guids/IGuidGenerator");
import IRouter = require("../Routers/IRouter");

import Address = require("../Common/Address");
import FilterEvaluator = require("../Filters/FilterEvaluator");
import FilterParser = require("../Filters/FilterParser");
import GuidGenerator = require("../Guids/GuidGenerator");
import LocalChordPeer = require("../../P2P.Chord/Core/LocalChordPeer");
import Message = require("../Common/Message");
import RequestDispatcher = require("../Http/RequestDispatcher");
import RestChordBroker = require("../Brokers/RestChordBroker");
import SubscriberListRouter = require("../Routers/SubscriberList/SubscriberListRouter");
import Subscription = require("../Common/Subscription");

class Framework implements IFramework
{
    private chord: LocalChordPeer;
    private guidGenerator: IGuidGenerator = new GuidGenerator();
    private parser: FilterParser;

    private address: Address;
    private isRunning = false;

    constructor(app: Application, host: string, port: number, endpoint: string = "spam", private router: IRouter = null, private broker: IBroker = null)
    {
        this.address = Address.fromHostPort(host, port);
        this.parser = new FilterParser();

        if (this.broker === null) this.broker = new RestChordBroker(this.address, new RequestDispatcher());
        if (this.router === null) this.router = new SubscriberListRouter(this.address, this.broker, new FilterEvaluator());

        this.chord = new LocalChordPeer(app, this.broker, host + ":" + port, endpoint);
    }

    public publish(tags: Array<string>, contents: any): void
    {
        this.guard(() => this.router.publish(new Message(contents, tags, this.guidGenerator)));
    }

    public subscribe(tags: Array<string>, callback: (tags: Array<string>, contents: any) => void, retrieveOldMessages: boolean = false): string
    {
        return this.subscribeToContents(tags, "true", callback, retrieveOldMessages);
    }

    public subscribeToContents(tags: Array<string>, filter: string, callback: (tags: Array<string>, contents: any) => void, retrieveOldMessages: boolean = false): string
    {
        return this.guard(() =>
        {
            var subscription = new Subscription(this.address, tags, this.parser.parse(filter), (m: Message) => callback(m.tags, m.contents), this.guidGenerator);
            this.router.subscribe(subscription, retrieveOldMessages);
            return subscription.id;
        });
    }

    public unsubscribe(id: string): void
    {
        this.guard(() => this.router.unsubscribe(id));
    }

    public join(domainHost: string, domainPort: number): void
    {
        this.guard(() => this.router.join(Address.fromHostPort(domainHost, domainPort)));
    }

    public run(): void
    {
        this.chord.run();
        this.isRunning = true;
    }

    private guard<T>(action: () => T): T
    {
        if (this.isRunning) return action();
        else throw new Error("The framework is not running.");
    }
}

export = Framework;