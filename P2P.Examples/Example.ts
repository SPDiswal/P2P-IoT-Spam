import SpamFramework = require("../P2P/Core/SpamFramework");
import Express = require("express");

var host = "127.0.0.1";
var port = 8080;

var app = Express();
var framework = new SpamFramework(app, host, port, "spamble"); // Spam-example

app.listen(port, host, () =>
{
    framework.run();
    framework.join("127.0.0.1", 8081);

    framework.publish([ "weather" ], { description: "sunny", temperature: 10, precipitation: 0, wind: "mind-blowing" });
});