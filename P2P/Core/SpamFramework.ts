import Express = require("express");
import Application = Express.Application;

import IFramework = require("../Interfaces/IFramework");
import IRoutingStrategy = require("../Interfaces/IRoutingStrategy");
import IBroker = require("../../P2P.Broker/Interfaces/IBroker");

import Address = require("./Address");
import RestChordBroker = require("../../P2P.Broker/Core/RestChordBroker");
import SubscriberListRoutingStrategy = require("../Strategies/SubscriberListRoutingStrategy");
import RequestDispatcher = require("../../P2P.Chord/Utilities/RequestDispatcher");
import Message = require("./Message");
import IGuidGenerator = require("../Interfaces/IGuidGenerator");
import GuidGenerator = require("../Utilities/GuidGenerator");
import Subscription = require("./Subscription");

class SpamFramework implements IFramework
{
    private guidGenerator: IGuidGenerator = new GuidGenerator();

    private address: Address;
    private isRunning = false;

    constructor(app: Application, host: string, port: number, endpoint: string = "spam", private router?: IRoutingStrategy, private broker?: IBroker)
    {
        this.address = new Address(host, port);

        app.get("/live", () => { });
    }

    public publish(tags: Array<string>, contents: any): void
    {
        if (this.isRunning)
        {
            this.router.publish(new Message(contents, tags, this.guidGenerator));
        }
        else
        {
            // TODO Throw error
        }
    }

    public subscribe(tags: Array<string>, filter: (tags: Array<string>, contents: any) => boolean, callback: (tags: Array<string>, contents: any) => void, retrieveOldMessages?: boolean): string
    {
        if (this.isRunning)
        {
            var subscription = new Subscription(this.address, (s: Message) => callback(s.tags, s.contents), tags, (s: Message) => filter(s.tags, s.contents), this.guidGenerator);
            this.router.subscribe(subscription, retrieveOldMessages);
            return subscription.id;
        }

        // TODO Throw error

        return null;
    }

    public unsubscribe(id: string): void
    {
        if (this.isRunning)
        {
            this.router.unsubscribe(id);
        }
        else
        {
            // TODO Throw error
        }
    }

    public join(domainHost: string, domainPort: number): void
    {
        if (this.isRunning)
        {
            this.router.join(new Address(domainHost, domainPort));
        }
        else
        {
            // TODO Throw error
        }
    }

    public run(): void
    {
        this.isRunning = true;

        if (this.broker === null) this.broker = new RestChordBroker(this.address, new RequestDispatcher());
        if (this.router === null) this.router = new SubscriberListRoutingStrategy(this.address, this.broker);
    }
}

export = SpamFramework;