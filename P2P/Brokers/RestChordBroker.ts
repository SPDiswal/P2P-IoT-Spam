import Q = require("q");
import Promise = Q.Promise;

import IBroker = require("./IBroker");
import IRequestDispatcher = require("../Http/IRequestDispatcher");
import IResponse = require("../Http/IResponse");

import Address = require("../Common/Address");
import Helpers = require("../Utilities/Helpers");
import HttpMethod = require("../Http/HttpMethod");
import RouterMessages = require("../Routers/RouterMessages");
import StatusCode = require("../Http/StatusCode");

class RestChordBroker implements IBroker
{
    // TODO Extend the RestChordBroker with logging capabilities so that we can measure network traffic.

    private incomingRouterCallback: (message: string, data: any) => Promise<any> = null;

    constructor(private address: Address, private request: IRequestDispatcher)
    {
    }

    public send(destination: Address, method: HttpMethod, message: string, data: any): Promise<any>
    {
        switch (message)
        {
            case RouterMessages.Join:
                return this.resolveOnNoContent(this.request.post(destination.toString() + "/join/" + (<Address>data).toString()));

            case RouterMessages.Lookup:
                return this.resolveToAddressOnOk(this.request.get(destination.toString() + "/lookup/" + Helpers.hash(<string>data)));

            case RouterMessages.GetResponsibility:
                return this.resolveOnSuccess(this.request.get(destination.toString() + "/responsibilities/" + data));

            case RouterMessages.GetAllResponsibilities:
                return this.resolveOnSuccess(this.request.get(destination.toString() + "/responsibilities"));

            case RouterMessages.PostResponsibility:
                return this.resolveOnNoContent(this.request.post(destination.toString() + "/responsibilities", JSON.stringify(data)));

            case RouterMessages.PutResponsibility:
                return this.resolveOnNoContent(this.request.put(destination.toString() + "/responsibilities", JSON.stringify(data)));

            case RouterMessages.DeleteResponsibility:
                return this.resolveOnNoContent(this.request.delete(destination.toString() + "/responsibilities/" + data));

            //    case "RetrieveAllMessages":
            //        this.request.get(address + "/messages/" + <string>data);
            //        break;
            //    
            //    case "Store":
            //        this.request.put(address + "/messages", JSON.stringify(<IMessage>data));
            //        break;
            //    
            //    case "Discard":
            //        this.request.delete(address + "/messages");
            //        break;

            default:
                return this.resolveOnSuccess(this.request.send(method, destination.toString() + "/action/" + message, JSON.stringify(data)));
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

    private resolveToAddressOnOk(promise: Promise<IResponse>): Promise<Address>
    {
        var deferred = Q.defer<Address>();

        promise.then(r =>
        {
            if (r.statusCode === StatusCode.Ok) deferred.resolve(Address.from(<string>r.response.peer));
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