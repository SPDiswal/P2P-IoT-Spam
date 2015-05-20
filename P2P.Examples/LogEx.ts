import BodyParser = require("body-parser");
import Express = require("express");
import File = require("fs");
import Q = require("q");

import Promise = Q.Promise;

import IRouter = require("../P2P/Routers/IRouter");

import Address = require("../P2P/Common/Address");
import Bottleneck = require("../P2P/Core/Bottleneck");
import RequestDispatcher = require("../P2P/Http/RequestDispatcher");
import RestChordBroker = require("../P2P/Brokers/RestChordBroker");
import SpanningTreeRouter = require("../P2P/Routers/SpanningTree/SpanningTreeRouter");
import StatusCode = require("../P2P/Http/StatusCode");
import SubscriberListRouter = require("../P2P/Routers/SubscriberList/SubscriberListRouter");

class LogEx
{
    private host: string;
    private port: number;
    private bottleneck: Bottleneck;
    private router: IRouter;
    private broker: RestChordBroker;
    private log = <Array<any>>[ ];

    constructor(private address: string)
    {
    }

    public run()
    {
        this.host = this.address.substring(0, this.address.indexOf(":"));
        this.port = parseInt(this.address.substring(this.address.indexOf(":") + 1));
        var app = Express();

        // Brings the framework to life.
        this.broker = new RestChordBroker("", new RequestDispatcher());
        this.router = new SubscriberListRouter(Address.from(this.address), this.broker);
        this.bottleneck = new Bottleneck(app, this.host, this.port, "", this.router, this.broker);

        app.listen(this.port, this.host, () =>
        {
            this.bottleneck.run();

            if (this.port !== 8080) setTimeout(() => this.bottleneck.join("127.0.0.1", 8080), 2000);
            setTimeout(() => this.experiment1(), 5000);
        });
    }

    private experiment1()
    {
        switch (this.port)
        {
            case 8080:
            case 8081:
            case 8082:
            case 8083:
                setTimeout(() => this.bottleneck.subscribe([ "weather" ], () => { }, false), 500);
                setTimeout(() => this.bottleneck.subscribe([ "weather", "public information" ], () => { }, false), 2000);
                setTimeout(() => this.bottleneck.subscribe(["public information"],() => { }, false), 6000);
                break;
        }

        switch (this.port)
        {
            case 8080:
            case 8081:
            case 8082:
            case 8083:
                setTimeout(() => this.bottleneck.publish([ "weather" ], { temperature: 10, wind: "mind-blowing" }), 3000);
                setTimeout(() => this.bottleneck.publish(["weather", "public information"], { temperature: 25, wind: "silent breeze", description: "summer is here" }), 4500);
                setTimeout(() => this.bottleneck.publish(["public information"], { "breaking news": "it is raining" }), 7000);
                setTimeout(() => this.bottleneck.publish([ "weather" ], { temperature: -42, wind: "freezing" }), 7500);
                setTimeout(() => this.bottleneck.publish([ "stocks" ], { "stock price": 1337, tendency: "rising" }), 8000);
                setTimeout(() => this.bottleneck.publish(["public information"], { "breaking news": "it is still raining" }), 9000);
                break;
        }

        /* TODO Save log into file. */

        setTimeout(() =>
        {
            console.log("Number of messages: " + this.broker.log.length);
            console.log("Data length: " + JSON.stringify(this.broker.log).length);
        }, 10000);
    }
}

if (process.argv.length >= 3 && !isNaN(parseInt(process.argv[2])))
{
    var program = process.argv.length === 3
                      ? new LogEx("127.0.0.1:" + process.argv[2])
                      : new LogEx(process.argv[2] + ":" + process.argv[3]);

    program.run();
}
else console.log("Usage: node example [host = 127.0.0.1] [port]");