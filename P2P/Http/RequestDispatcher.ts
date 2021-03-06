﻿import Http = require("http");
import Https = require("https");
import Q = require("q");
import Promise = Q.Promise;

import IRequestDispatcher = require("./IRequestDispatcher");
import IResponse = require("./IResponse");

class RequestDispatcher implements IRequestDispatcher
{
    private send(method: string, url: string, data: string = ""): Promise<IResponse>
    {
        var options: any = { method: method };
        var protocol = "http";

        if (url.indexOf("http") === 0 || url.indexOf("https") === 0)
        {
            // Extracts the protocol intended for the request, e.g. HTTP or HTTPS.
            protocol = url.substring(0, url.indexOf(":"));

            // Splits the remainder of the URL into the host (domain), port and path.
            url = url.substring(url.indexOf(":") + 3);
        }

        options.host = url.substring(0, url.indexOf("/"));
        options.path = url.substring(url.indexOf("/"));

        if (options.host.indexOf(":") > -1)
        {
            var domain = options.host.split(":");
            options.host = domain[0];
            options.port = domain[1];
        }

        // Sets HTTP headers when sending data.
        if (typeof data !== "undefined")
        {
            options.headers = {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data)
            };
        }

        // Dispatches the request asynchronously, returning a promise.
        var deferred = Q.defer<IResponse>();
        var responseHandler = (response: Http.ClientResponse) =>
        {
            var responseBody = "";

            response.on("data", (chunk: string) => { responseBody += chunk; });
            response.on("end", () =>
            {
                try
                {
                    deferred.resolve(<IResponse>
                    {
                        response: responseBody === "" ? responseBody : JSON.parse(responseBody),
                        statusCode: response.statusCode
                    });
                }
                catch (e)
                {
                    deferred.reject(e);
                }
            });
        };

        var request = protocol === "https"
                          ? Https.request(options, responseHandler)
                          : Http.request(options, responseHandler);

        request.on("error", (e: any) => { deferred.reject(e); });
        request.end(data);

        return deferred.promise;
    }

    public "delete"(url: string, data: string = "") { return this.send("DELETE", url, data); }

    public "get"(url: string, data: string = "") { return this.send("GET", url, data); }

    public post(url: string, data: string = "") { return this.send("POST", url, data); }

    public put(url: string, data: string = "") { return this.send("PUT", url, data); }
}

export = RequestDispatcher;