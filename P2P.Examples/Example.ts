import BodyParser = require("body-parser");
import Express = require("express");
import File = require("fs");

import Framework = require("../P2P/Core/Framework");
import StatusCode = require("../P2P/Http/StatusCode");
import Evaluator = require("../P2P/Filters/FilterEvaluator");
import Message1 = require("../P2P/Common/Message");

class Example
{
    constructor(private address: string)
    {
    }

    public getHtml(htmlPage: string, req: Express.Request, res: Express.Response)
    {
        File.readFile("Views/" + htmlPage + ".html", "utf8", (err, htmlTemplate) =>
        {
            var html = htmlTemplate.split("{{ selfAddr }}").join(this.address);
            res.status(200).header("Content-Type", "text/html; charset=UTF-8").end(html);
        });
    }

    public getScript(scriptFile: string, req: Express.Request, res: Express.Response)
    {
        File.readFile("Scripts/" + scriptFile + ".js", "utf8", (err, scriptTemplate) =>
        {
            var js = scriptTemplate.split("{{ selfAddr }}").join(this.address);
            res.status(200).header("Content-Type", "application/javascript; charset=utf-8").end(js);
        });
    }

    public run()
    {
        var host = this.address.substring(0, this.address.indexOf(":"));
        var port = parseInt(this.address.substring(this.address.indexOf(":") + 1));

        var app = Express();
        var framework = new Framework(app, host, port, ""); // Spam-example

        var jsonParser = BodyParser.json();

        app.post("/join/:port", (req, res) =>
        {
            framework.join("127.0.0.1", parseInt(req.params.port));
            res.sendStatus(StatusCode.NoContent);
        });

        app.post("/publish", jsonParser, (req, res) =>
        {
            //            framework.publish(req.body.tags, req.body.contents);
            framework.publish([ "weather" ], { description: "sunny", temperature: 10, precipitation: 0, wind: "mind-blowing" });
            res.sendStatus(StatusCode.NoContent);
        });

        app.post("/subscribe", jsonParser, (req, res) =>
        {
            res.sendStatus(StatusCode.NoContent);
            //            console.log("New subscription: " + framework.subscribe(req.body.tags, (tags: Array<string>, contents: any) => console.log("New message: " + tags + " " + contents)));

            framework.subscribeToContents([ "weather" ], (tags, contents: any) => contents.temperature === 10, (tags, contents: any) => console.log("New message: " + JSON.stringify(tags) + " " + JSON.stringify(contents)))
                .then(s => console.log("New subscription: " + s))
                .catch(e => console.log(e));
        });

        app.post("/unsubscribe/:id", (req, res) =>
        {
            res.sendStatus(StatusCode.NoContent);
            framework.unsubscribe(req.params.id);
        });

        // Adds web interface resources.
        app.get("/", (req, res) => this.getHtml("index", req, res));
        app.get("/Scripts/interface.js", (req, res) => this.getScript("interface", req, res));

        app.use(Express.static(__dirname + "/"));

        app.listen(port, host, () =>
        {
            framework.run();
            //            console.log("New subscription: " + framework.subscribe(["weather"],(tags: Array<string>, contents: any) => console.log("New message: " + JSON.stringify(tags) + " " + JSON.stringify(contents))));
        });
    }
}

if (process.argv.length >= 3 && !isNaN(parseInt(process.argv[2])))
{
    var program = process.argv.length === 3
                      ? new Example("127.0.0.1:" + process.argv[2])
                      : new Example(process.argv[2] + ":" + process.argv[3]);

    program.run();
}
else console.log("Usage: node example [host = 127.0.0.1] [port]");