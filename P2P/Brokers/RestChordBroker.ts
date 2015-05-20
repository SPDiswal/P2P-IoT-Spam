import Q = require("q");
import Promise = Q.Promise;

import IBroker = require("./IBroker");
import IRequestDispatcher = require("../Http/IRequestDispatcher");
import IResponse = require("../Http/IResponse");

import Address = require("../Common/Address");
import Helpers = require("../Utilities/Helpers");
import RouterMessages = require("../Routers/RouterMessages");
import StatusCode = require("../Http/StatusCode");

class RestChordBroker implements IBroker
{
    private incomingRouterCallback: (message: string, data: any) => Promise<any> = null;

    public log = <Array<any>>[ ];

    constructor(private endpoint: string, private request: IRequestDispatcher)
    {
    }

    public send(destination: Address, message: string, data: any): Promise<any>
    {
        this.log.push({ destination: destination, message: message, data: data });

        switch (message)
        {
            case RouterMessages.Ping:
                return this.resolveOnNoContent(this.request.get(destination.toString() + this.endpoint + "/ping"));

            case RouterMessages.Join:
                return this.resolveOnNoContent(this.request.post(destination.toString() + this.endpoint + "/join/" + (<Address>data).toString()));

            case RouterMessages.Lookup:
                return this.resolveOnSuccess(this.request.get(destination.toString() + this.endpoint + "/lookup/" + Helpers.hash(<string>data))).then((p: string) => Address.from(p));

            case RouterMessages.GetResponsibility:
                return this.resolveOnSuccess(this.request.get(destination.toString() + this.endpoint + "/responsibilities/" + data));

            case RouterMessages.GetAllResponsibilities:
                return this.resolveOnSuccess(this.request.get(destination.toString() + this.endpoint + "/responsibilities"));

            case RouterMessages.PostResponsibility:
                return this.resolveOnNoContent(this.request.post(destination.toString() + this.endpoint + "/responsibilities", JSON.stringify(data)));

            case RouterMessages.PutResponsibility:
                return this.resolveOnNoContent(this.request.put(destination.toString() + this.endpoint + "/responsibilities", JSON.stringify(data)));

            case RouterMessages.DeleteResponsibility:
                return this.resolveOnNoContent(this.request.delete(destination.toString() + this.endpoint + "/responsibilities/" + data));

            case RouterMessages.Retrieve:
                return this.resolveOnSuccess(this.request.get(destination.toString() + this.endpoint + "/data/tag/" + data));

            case RouterMessages.RetrieveSince:
                return this.resolveOnSuccess(this.request.get(destination.toString() + this.endpoint + "/data/tag/" + data.identifier + "/" + data.timestamp));

            case RouterMessages.Persist:
                return this.resolveOnNoContent(this.request.post(destination.toString() + this.endpoint + "/data", JSON.stringify(data)));

            case RouterMessages.Sweep:
                return this.resolveOnNoContent(this.request.delete(destination.toString() + this.endpoint + "/data/" + data));

            default:
                return this.resolveOnSuccess(this.request.post(destination.toString() + this.endpoint + "/action/" + message, JSON.stringify(data)));
        }
    }

    public incoming(callback: (message: string, data: any) => Promise<any>)
    {
        this.incomingRouterCallback = callback;
    }

    public delegate(message: string, data: any): Promise<any>
    {
        var deferred = Q.defer<any>();

        if (this.incomingRouterCallback !== null)
        {
            this.incomingRouterCallback(message, data)
                .then((result: any) => deferred.resolve(result))
                .catch(() => deferred.reject((void 0)));
        }
        else
            deferred.reject((void 0));

        return deferred.promise;
    }

    // HELPERS: Promise resolution on HTTP responses
    private resolveOnNoContent(promise: Promise<IResponse>): Promise<void>
    {
        var deferred = Q.defer<void>();

        promise.then(r =>
        {
            if (r.statusCode === StatusCode.NoContent) deferred.resolve((void 0));
            else deferred.reject((void 0));
            //
        }).catch(() => deferred.reject((void 0)));

        return deferred.promise;
    }

    private resolveOnSuccess(promise: Promise<IResponse>): Promise<any>
    {
        var deferred = Q.defer<any>();

        promise.then(r =>
        {
            if (r.statusCode === StatusCode.Ok || r.statusCode === StatusCode.NoContent) deferred.resolve(r.response);
            else deferred.reject((void 0));
            //
        }).catch(() => deferred.reject((void 0)));

        return deferred.promise;
    }
}

export = RestChordBroker;