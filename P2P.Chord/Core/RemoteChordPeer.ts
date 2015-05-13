import Q = require("q");
import Promise = Q.Promise;

import IPeer = require("../Interfaces/IPeer");
import IResponse = require("../../P2P/Http/IResponse");

import Constants = require("./Constants");
import Helpers = require("../../P2P/Utilities/Helpers");
import RequestDispatcher = require("../../P2P/Http/RequestDispatcher");
import StatusCode = require("../../P2P/Http/StatusCode");

class RemoteChordPeer implements IPeer
{
    private _id: number;
    private request = new RequestDispatcher();

    constructor(private _address: string, private endpoint: string)
    {
        this._id = Helpers.hash(_address);
    }

    public get address(): string
    {
        return this._address;
    }

    public get id(): number
    {
        return this._id;
    }

    public ping(): Promise<void>
    {
        return this.resolve(this.request.get(this.address + this.endpoint + "/ping").timeout(Constants.Timeout));
    }

    public getPredecessor(): Promise<string>
    {
        return this.resolvePeer(this.request.get(this.address + this.endpoint + "/predecessor").timeout(Constants.Timeout));
    }

    public setPredecessor(newPredecessor: string): Promise<void>
    {
        return this.resolve(this.request.put(this.address + this.endpoint + "/predecessor/" + newPredecessor).timeout(Constants.Timeout));
    }

    public getSuccessor(index: number): Promise<string>
    {
        if (index === 0)
            return this.resolvePeer(this.request.get(this.address + this.endpoint + "/successor").timeout(Constants.Timeout));

        return this.resolvePeer(this.request.get(this.address + this.endpoint + "/successors/" + index).timeout(Constants.Timeout));
    }

    public setSuccessor(index: number, newSuccessor: string): Promise<void>
    {
        if (index === 0)
            return this.resolve(this.request.put(this.address + this.endpoint + "/successor/" + newSuccessor).timeout(Constants.Timeout));

        return this.resolve(this.request.put(this.address + this.endpoint + "/successors/" + index + "/" + newSuccessor).timeout(Constants.Timeout));
    }

    public getFinger(index: number): Promise<string>
    {
        return this.resolvePeer(this.request.get(this.address + this.endpoint + "/fingers/" + index).timeout(Constants.Timeout));
    }

    public setFinger(index: number, newFinger: string): Promise<void>
    {
        return this.resolve(this.request.put(this.address + this.endpoint + "/fingers/" + index + "/" + newFinger).timeout(Constants.Timeout));
    }

    public lookup(key: number): Promise<string>
    {
        return this.resolvePeer(this.request.get(this.address + this.endpoint + "/lookup/" + key).timeout(Constants.Timeout));
    }

    public notify(potentialPredecessor: string): Promise<void>
    {
        return this.resolve(this.request.post(this.address + this.endpoint + "/notify/" + potentialPredecessor).timeout(Constants.Timeout));
    }

    private resolvePeer(p: Promise<IResponse>)
    {
        var deferred = Q.defer<string>();

        p.then(r =>
        {
            switch (r.statusCode)
            {
                case StatusCode.Ok:
                    deferred.resolve(r.response.peer);
                    break;

                default:
                    deferred.reject((void 0));
                    break;
            }
        }).catch(() => deferred.reject((void 0)));

        return deferred.promise;
    }

    private resolve(p: Promise<IResponse>)
    {
        var deferred = Q.defer<void>();

        p.then(r =>
        {
            switch (r.statusCode)
            {
                case StatusCode.NoContent:
                    deferred.resolve((void 0));
                    break;

                default:
                    deferred.reject((void 0));
                    break;
            }
        }).catch(() => deferred.reject((void 0)));

        return deferred.promise;
    }
}

export = RemoteChordPeer;