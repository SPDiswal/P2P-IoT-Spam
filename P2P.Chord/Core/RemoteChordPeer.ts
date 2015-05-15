import Q = require("q");
import Promise = Q.Promise;

import IPeer = require("./IPeer");
import IResponse = require("../../P2P/Http/IResponse");

import Constants = require("./Constants");
import Helpers = require("../../P2P/Utilities/Helpers");
import Message = require("../../P2P/Common/Message");
import RequestDispatcher = require("../../P2P/Http/RequestDispatcher");
import Responsibility = require("../../P2P/Common/Responsibility");
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
        return this.resolveUnit(this.request.get(this.address + this.endpoint + "/ping").timeout(Constants.Timeout));
    }

    public getPredecessor(): Promise<string>
    {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/predecessor").timeout(Constants.Timeout));
    }

    public setPredecessor(newPredecessor: string): Promise<void>
    {
        return this.resolveUnit(this.request.put(this.address + this.endpoint + "/predecessor/" + newPredecessor).timeout(Constants.Timeout));
    }

    public getSuccessor(index: number): Promise<string>
    {
        if (index === 0) return this.resolveData(this.request.get(this.address + this.endpoint + "/successor").timeout(Constants.Timeout));
        return this.resolveData(this.request.get(this.address + this.endpoint + "/successors/" + index).timeout(Constants.Timeout));
    }

    public setSuccessor(index: number, newSuccessor: string): Promise<void>
    {
        if (index === 0) return this.resolveUnit(this.request.put(this.address + this.endpoint + "/successor/" + newSuccessor).timeout(Constants.Timeout));
        return this.resolveUnit(this.request.put(this.address + this.endpoint + "/successors/" + index + "/" + newSuccessor).timeout(Constants.Timeout));
    }

    public getFinger(index: number): Promise<string>
    {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/fingers/" + index).timeout(Constants.Timeout));
    }

    public setFinger(index: number, newFinger: string): Promise<void>
    {
        return this.resolveUnit(this.request.put(this.address + this.endpoint + "/fingers/" + index + "/" + newFinger).timeout(Constants.Timeout));
    }

    public lookup(key: number): Promise<string>
    {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/lookup/" + key).timeout(Constants.Timeout));
    }

    public notify(potentialPredecessor: string): Promise<void>
    {
        return this.resolveUnit(this.request.post(this.address + this.endpoint + "/notify/" + potentialPredecessor).timeout(Constants.Timeout));
    }

    public getResponsibility(identifier: string): Promise<Responsibility>
    {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/responsibilities/" + identifier).timeout(Constants.Timeout))
            .then((t: any) => Responsibility.deserialise(t));
    }

    public getResponsibilities(): Promise<Array<Responsibility>>
    {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/responsibilities").timeout(Constants.Timeout))
            .then((r: any) => r.map((t: any) => Responsibility.deserialise(t)));
    }

    public postResponsibility(responsibility: Responsibility): Promise<void>
    {
        return this.resolveUnit(this.request.post(this.address + this.endpoint + "/responsibilities", JSON.stringify(responsibility)).timeout(Constants.Timeout));
    }

    public putResponsibility(responsibility: Responsibility): Promise<void>
    {
        return this.resolveUnit(this.request.put(this.address + this.endpoint + "/responsibilities", JSON.stringify(responsibility)).timeout(Constants.Timeout));
    }

    public deleteResponsibility(identifier: string): Promise<void>
    {
        return this.resolveUnit(this.request.delete(this.address + this.endpoint + "/responsibilities/" + identifier).timeout(Constants.Timeout));
    }

    public getReplication(identifier: string): Promise<Responsibility>
    {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/replications/" + identifier).timeout(Constants.Timeout))
            .then((t: any) => Responsibility.deserialise(t));
    }

    public getReplications(): Promise<Array<Responsibility>>
    {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/replications").timeout(Constants.Timeout))
            .then((r: any) => r.map((t: any) => Responsibility.deserialise(t)));
    }

    public postReplication(responsibility: Responsibility): Promise<void>
    {
        return this.resolveUnit(this.request.post(this.address + this.endpoint + "/replications", JSON.stringify(responsibility)).timeout(Constants.Timeout));
    }

    public putReplication(responsibility: Responsibility): Promise<void>
    {
        return this.resolveUnit(this.request.put(this.address + this.endpoint + "/replications", JSON.stringify(responsibility)).timeout(Constants.Timeout));
    }

    public deleteReplication(identifier: string): Promise<void>
    {
        return this.resolveUnit(this.request.delete(this.address + this.endpoint + "/replications/" + identifier).timeout(Constants.Timeout));
    }

    public getAllData(): Promise<Array<Message>>
    {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/data").timeout(Constants.Timeout))
            .then((r: any) => r.map((m: any) => Message.deserialise(m)));
    }

    public getAllDataSince(timestamp: string): Promise<Array<Message>>
    {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/data/timestamp/" + timestamp).timeout(Constants.Timeout))
            .then((r: any) => r.map((m: any) => Message.deserialise(m)));
    }

    public getData(tag: string): Promise<Array<Message>>
    {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/data/tag/" + tag).timeout(Constants.Timeout))
            .then((r: any) => r.map((m: any) => Message.deserialise(m)));
    }

    public getDataSince(tag: string, timestamp: string): Promise<Array<Message>> {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/data/tag/" + tag + "/" + timestamp).timeout(Constants.Timeout))
            .then((r: any) => r.map((m: any) => Message.deserialise(m)));
    }

    public getMostRecentTimestamp(): Promise<Date>
    {
        return this.resolveData(this.request.get(this.address + this.endpoint + "/data/timestamp").timeout(Constants.Timeout));
    }

    public postData(incomingData: Message): Promise<void>
    {
        return this.resolveUnit(this.request.post(this.address + this.endpoint + "/data", JSON.stringify(incomingData)).timeout(Constants.Timeout));
    }

    public putData(incomingData: Message): Promise<void>
    {
        return this.resolveUnit(this.request.put(this.address + this.endpoint + "/data", JSON.stringify(incomingData)).timeout(Constants.Timeout));
    }

    public deleteData(timestamp: string): Promise<void>
    {
        return this.resolveUnit(this.request.delete(this.address + this.endpoint + "/data/" + timestamp).timeout(Constants.Timeout));
    }

//    private resolvePeer(p: Promise<IResponse>): Promise<string>
//    {
//        var deferred = Q.defer<string>();
//
//        p.then(r =>
//        {
//            switch (r.statusCode)
//            {
//                case StatusCode.Ok:
//                    deferred.resolve(r.response);
//                    break;
//
//                default:
//                    deferred.reject((void 0));
//                    break;
//            }
//        }).catch(() => deferred.reject((void 0)));
//
//        return deferred.promise;
//    }

    private resolveData(p: Promise<IResponse>): Promise<any>
    {
        var deferred = Q.defer<any>();

        p.then(r =>
        {
            if (r.statusCode === StatusCode.Ok) deferred.resolve(r.response);
            else deferred.reject((void 0));
        }).catch(() => deferred.reject((void 0)));

        return deferred.promise;
    }

    private resolveUnit(p: Promise<IResponse>): Promise<void>
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