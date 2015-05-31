import BodyParser = require("body-parser");
import Express = require("express");
import File = require("fs");
import Q = require("q");

import Promise = Q.Promise;

import IRouter = require("../P2P/Routers/IRouter");

import Bottleneck = require("../P2P/Core/Bottleneck");
import RestChordBroker = require("../P2P/Brokers/RestChordBroker");
import StatusCode = require("../P2P/Http/StatusCode");

class Demo
{
    private bottleneck: Bottleneck;
    private port: number;
    private host: string;
    private router: IRouter;
    private broker: RestChordBroker;

    private messages = <Array<string>>[ ];

    constructor(private address: string)
    {
    }

    private respond(res: Express.Response, promise: Promise<boolean>)
    {
        promise.then(status =>
            {
                if (status) res.sendStatus(StatusCode.NoContent);
                else res.sendStatus(StatusCode.InternalServerError);
            })
            .catch(() => res.sendStatus(StatusCode.InternalServerError));
    }

    private respondWithId(res: Express.Response, promise: Promise<string>)
    {
        promise.then(id =>
            {
                this.messages.push("New subscription: " + id);
                if (id) res.status(StatusCode.Ok).json(id);
                else res.sendStatus(StatusCode.InternalServerError);
            })
            .catch(() => res.sendStatus(StatusCode.InternalServerError));
    }

    private getHtml(htmlPage: string, req: Express.Request, res: Express.Response)
    {
        File.readFile("Views/" + htmlPage + ".html", "utf8", (err, htmlTemplate) =>
        {
            var html = htmlTemplate.split("{{ selfAddr }}").join(this.address);
            res.status(200).header("Content-Type", "text/html; charset=UTF-8").end(html);
        });
    }

    private getScript(scriptFile: string, req: Express.Request, res: Express.Response)
    {
        File.readFile("Scripts/" + scriptFile + ".js", "utf8", (err, scriptTemplate) =>
        {
            var js = scriptTemplate.split("{{ selfAddr }}").join(this.address);
            res.status(200).header("Content-Type", "application/javascript; charset=utf-8").end(js);
        });
    }

    public run()
    {
        this.host = this.address.substring(0, this.address.indexOf(":"));
        this.port = parseInt(this.address.substring(this.address.indexOf(":") + 1));
        var app = Express();

        // Enables browser demo.
        app.get("/", (req, res) => this.getHtml("index", req, res));
        app.get("/Scripts/demo.js", (req, res) => this.getScript("demo", req, res));

        app.use(Express.static(__dirname + "/"));

        // Brings the framework to life.

        // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
        this.bottleneck = new Bottleneck(app, this.host, this.port);
        // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

        this.setUp(app, this.bottleneck);

        // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
        app.listen(this.port, this.host, () => this.bottleneck.run());
        // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
    }

    private setUp(app: Express.Application, framework: Bottleneck)
    {
        var jsonParser = BodyParser.json();

        app.get("/messages", (req, res) =>
        {
            res.status(StatusCode.Ok).json(this.messages);
            this.messages = [ ];
        });

        app.post("/join/:port", (req, res) =>
        {
            console.log("Joining " + req.params.port);

            // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
            var status = framework.join("127.0.0.1" /* Hard-coded localhost */, parseInt(req.params.port));
            // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

            this.messages.push("Joined 127.0.0.1:" + req.params.port);
            this.respond(res, status);
        });

        app.post("/publish", jsonParser, (req, res) =>
        {
            console.log("Publishing " + JSON.stringify(req.body));

            // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
            var status = framework.publish(req.body.tags, req.body.contents);
            // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

            this.messages.push("Published " + JSON.stringify(req.body));
            this.respond(res, status);
        });

        app.post("/subscribe", jsonParser, (req, res) =>
        {
            console.log("Subscribing to " + JSON.stringify(req.body));

            var tags = req.body.tags;
            var filter = eval(req.body.filter);
            var callback = (t: string[], c: any) =>
            {
                console.log("New message: " + JSON.stringify(t) + ": " + JSON.stringify(c));
                this.messages.push("New message: " + JSON.stringify(t) + ": " + JSON.stringify(c));
            };
            var retrieveOldMessages = req.body.retrieveOldMessages;

            // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
            var id = framework.subscribeToContents(tags, filter /* Evil Hacks Inc. */, callback, retrieveOldMessages);
            // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

            this.messages.push("Subscribed to " + JSON.stringify(req.body));
            this.respondWithId(res, id);
        });

        app.post("/unsubscribe/:id", (req, res) =>
        {
            console.log("Unsubscribing " + req.params.id);

            // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
            var status = framework.unsubscribe(req.params.id);
            // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

            this.messages.push("Unsubscribed " + req.params.id);
            this.respond(res, status);
        });
    }
}

if (process.argv.length >= 3 && !isNaN(parseInt(process.argv[2])))
{
    var program = process.argv.length === 3
                      ? new Demo("127.0.0.1:" + process.argv[2])
                      : new Demo(process.argv[2] + ":" + process.argv[3]);

    program.run();
}
else console.log("Usage: node example [host = 127.0.0.1] [port]");