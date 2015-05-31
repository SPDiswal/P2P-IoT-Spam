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
import SubscriberListRouter = require("../P2P/Routers/SubscriberList/SubscriberListRouter");

class Experiment
{
    private host = "127.0.0.1";
    private bottleneck: Bottleneck;
    private router: IRouter;
    private broker: RestChordBroker;

    private log = <Array<any>>[ ];
    private numberOfReceivedMessages = 0;

    private numberOfPublishedMessages: any;
    private numberOfSubscriptions: any;
    private experiment: Array<() => void>;
    private totalNumberOfSteps: number;

    constructor(private port: number, private experimentType: number, private setting: number, private routerType: number, private stabiliseDelay: number, private smallestFailingPort: number, private stepsUntilFailure: number, private isLastSample: number)
    {
        var address = this.host + ":" + this.port;
        this.broker = new RestChordBroker("", new RequestDispatcher());

        if (this.routerType === 0)
            this.router = new SubscriberListRouter(Address.from(address), this.broker);
        else
            this.router = new SpanningTreeRouter(Address.from(address), this.broker);

        switch (this.setting)
        {
            case 0:
                this.experiment = this.subscriptions(6).concat(this.publishMessages(6, 2)).concat(this.delayExperimentBy(62));
                break;

            case 1:
                this.experiment = this.subscriptions(6).concat(this.publishMessages(6, 5)).concat(this.delayExperimentBy(44));
                break;

            case 2:
                this.experiment = this.subscriptions(12).concat(this.publishMessages(12, 2)).concat(this.delayExperimentBy(44));
                break;

            default:
                this.experiment = this.subscriptions(12).concat(this.publishMessages(12, 5)).concat(this.delayExperimentBy(8));
                break;
        }

        this.totalNumberOfSteps = this.experiment.length;
    }

    public run()
    {
        var app = Express();
        this.bottleneck = new Bottleneck(app, this.host, this.port, "", this.router, this.broker, this.stabiliseDelay);

        console.log("Experiment on " + this.port);

        app.listen(this.port, this.host, () =>
        {
            this.bottleneck.run();
            this.runExperiment();
        });
    }

    private subscriptions(numberOfSubscriptions: number): Array<() => void>
    {
        // All peers are joined and there is a fixed number of subscriptions of common tags in the network.
        var repeatedEvents = <Array<any>>[ ];

        for (var i = 0; i < numberOfSubscriptions; i++)
        {
            ((j: number) =>
            {
                if (j % 2 === 0)
                    repeatedEvents.push(() => { this.bottleneck.subscribe([ "weather:" + j ], () => { this.numberOfReceivedMessages++; }, false) });
                else
                    repeatedEvents.push(() => { this.bottleneck.subscribeToContents([ "weather:" + j ], () => false, () => { this.numberOfReceivedMessages++; }, false) });
            })(i);
        }

        return repeatedEvents;
    }

    private publishMessages(numberOfSubscriptions: number, numberOfMessages: number): Array<() => void>
    {
        var repeatedEvents = <Array<any>>[ ];

        for (var k = 0; k < numberOfMessages; k++)
        {
            for (var i = 0; i < numberOfSubscriptions; i++)
            {
                ((j: number) =>
                {
                    repeatedEvents.push(() => { this.bottleneck.publish([ "weather:" + j ], { temperature: j + 8 }) });
                })(i);
            }
        }

        return repeatedEvents;
    }

    private runExperiment()
    {
        if (this.port !== 8080)
        {
            setTimeout(() =>
            {
                this.bottleneck.join("127.0.0.1", 8080);
                console.log("Joined 8080");
            }, 500);
        }

        setTimeout(() => this.stepThroughEvents(this.experiment), 5 * this.stabiliseDelay / 4);
    }

    private stepThroughEvents(events: Array<() => void>)
    {
        var eventInterval = 250;
        var interval = setInterval(() =>
        {
            console.log("Remaining steps: " + events.length);

            if (events.length > 0)
            {
                if (this.port >= this.smallestFailingPort && this.stepsUntilFailure <= this.totalNumberOfSteps - events.length)
                    process.exit();

                var nextEvent = events.shift();
                nextEvent();
            }
            else
            {
                clearInterval(interval);
                var log = this.broker.log;

                // Remove the join-entry of the log.
                if (this.port !== 8080) log.shift();

                console.log("Experiment on " + this.port + " finished.");
                var filename = __dirname + "\\Results\\" + this.experimentType + "." + this.setting + "." + (this.routerType === 0 ? "SubscriberList" : "SpanningTree") + "." + this.port + ".txt";

                if (this.experimentType === 0 || this.experimentType === 1)
                {
                    //                    console.log("Number of messages handled: " + log.length);
                    //                    console.log("Data length: " + JSON.stringify(log).length + "\n");
                    File.appendFileSync(filename, log.length + (this.isLastSample ? "\n" : "\t"));
                }
                else
                {
                    //                    console.log("Number of received messages: " + this.numberOfReceivedMessages);
                    File.appendFileSync(filename, this.numberOfReceivedMessages + (this.isLastSample ? "\n" : "\t"));
                }

                process.exit();
            }
        }, eventInterval);
    }

    private delayExperimentBy(steps: number): Array<() => void>
    {
        return this.repeatEvent(() => { }, steps);
    }

    private repeatEvent(event: () => void, times: number): Array<() => void>
    {
        var repeatedEvents = <Array<any>>[ ];

        for (var i = 0; i < times; i++)
            repeatedEvents.push(event);

        return repeatedEvents;
    }
}

if (process.argv.length === 10)
{
    new Experiment(
        parseInt(process.argv[2] /* Port */),
        parseInt(process.argv[3] /* Output type */),
        parseInt(process.argv[4] /* Setting */),
        parseInt(process.argv[5] /* Router */),
        parseInt(process.argv[6] /* Stabilisation interval */),
        parseInt(process.argv[7] /* Smallest failing port */),
        parseInt(process.argv[8] /* Number of steps until failure */),
        parseInt(process.argv[9] /* Is last sample of experiment */)).run();
}
else
    console.log("Usage: node experiment " +
        "[port] " +
        "[experiment, 0-1 = number of messages handled, 2-3 = number of published messages received] " +
        "[setting, 0 = 6 subscriptions/15 messages, 1 = 6 subscriptions/30 messages, 2 = 12 subscriptions/15 messages, 3 = 12 subscriptions/30 messages] " +
        "[router, 0 = subscriber list, 1 = spanning tree] " +
        "[stabilisation interval, in milliseconds] " +
        "[smallest failing port] " +
        "[number of steps until failure] " +
        "[is last sample of experiment (makes new line in file), 0 = no, 1 = yes]");