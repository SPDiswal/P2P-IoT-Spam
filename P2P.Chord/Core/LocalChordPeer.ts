/// <reference path="../Scripts/typings/nedb/nedb.d.ts" />

import BodyParser = require("body-parser");
import Express = require("express");
import NeDB = require("nedb");
import Q = require("q");

import Application = Express.Application;
import Response = Express.Response;
import Promise = Q.Promise;

import IBroker = require("../../P2P/Brokers/IBroker");
import IPeer = require("./IPeer");

import ArrayUtilities = require("../../P2P/Utilities/ArrayUtilities");
import Constants = require("./Constants");
import DataRow = require("./DataRow");
import Helpers = require("../../P2P/Utilities/Helpers");
import Message = require("../../P2P/Common/Message");
import RemoteChordPeer = require("./RemoteChordPeer");
import Responsibility = require("../../P2P/Common/Responsibility");
import RouterMessages = require("../../P2P/Routers/RouterMessages");
import StatusCode = require("../../P2P/Http/StatusCode");

class LocalChordPeer implements IPeer
{
    private _id: number;

    private predecessor: IPeer = null;
    private fingers: Array<IPeer> = [ ];
    private successors: Array<IPeer> = [ ];

    private get successor(): IPeer
    {
        return this.successors[0];
    }

    private currentFingerFixed = 0;
    private currentSuccessorFixed = 0;

    private stabiliseInterval: any;
    private checkPredecessorInterval: any;
    private fixFingersInterval: any;
    private fixSuccessorsInterval: any;
    private checkResponsibilitiesInterval: any;
    private checkReplicationsInterval: any;
    private synchroniseDataInterval: any;
    private heartbeatInterval: any;

    private responsibilities: Array<Responsibility> = [ ];
    private replications: Array<Responsibility> = [ ];

    private database: NeDB;

    constructor(app: Application, private broker: IBroker, private _address: string, private endpoint: string, private isLogging = false)
    {
        this._id = Helpers.hash(_address);

        this.setUpDatabase();
        this.setUpEndpoints(app);
    }

    private setUpDatabase()
    {
        var dataPath = __dirname + "/../Data/" + this.id + ".db";
        this.database = new NeDB({ filename: dataPath, autoload: true });
    }

    private setUpEndpoints(app: Application)
    {
        var jsonParser = BodyParser.json();

        // 
        // CHORD
        // 
        app.get(this.endpoint + "/lookup/:key", (req, res) => this.respondWithOkOnNumbers(res, req.params.key,
            key => this.lookup(key)));

        app.get(this.endpoint + "/predecessor", (req, res) => this.respondWithOk(res,
            this.getPredecessor()));

        app.put(this.endpoint + "/predecessor/:address", (req, res) => this.respondWithNoContentOrBadRequest(res,
            this.setPredecessor(req.params.address)));

        app.get(this.endpoint + "/successor", (req, res) => this.respondWithOk(res,
            this.getSuccessor(0)));

        app.put(this.endpoint + "/successor/:address", (req, res) => this.respondWithNoContentOrBadRequest(res,
            this.setSuccessor(0, req.params.address)));

        app.get(this.endpoint + "/successors/:index", (req, res) => this.respondWithOkOnNumbers(res, req.params.index,
            index => this.getSuccessor(index), Constants.SuccessorsCount));

        app.put(this.endpoint + "/successors/:index/:address", (req, res) => this.respondWithNoContentOrBadRequestOnNumbers(res, req.params.index,
            index => this.setSuccessor(index, req.params.address), Constants.SuccessorsCount));

        app.get(this.endpoint + "/fingers/:index", (req, res) => this.respondWithOkOnNumbers(res, req.params.index,
            index => this.getFinger(index), Constants.SpaceSize));

        app.put(this.endpoint + "/fingers/:index/:address", (req, res) => this.respondWithNoContentOrBadRequestOnNumbers(res, req.params.index,
            index => this.setFinger(index, req.params.address), Constants.SpaceSize));

        app.get(this.endpoint + "/ping", (req, res) => this.respondWithNoContent(res,
            this.ping()));

        app.post(this.endpoint + "/notify/:address", (req, res) => this.respondWithNoContent(res,
            this.notify(req.params.address)));

        app.post(this.endpoint + "/join/:address", (req, res) => this.respondWithNoContent(res,
            this.join(req.params.address)));

        app.post(this.endpoint + "/leave", (req, res) => this.respondWithNoContent(res,
            this.leave()));

        // 
        // ACTIONS
        // 
        app.post(this.endpoint + "/action/:message", jsonParser, (req, res) => this.respondWithOkOrNoContent(res,
            this.action(req.params.message, req.body)));

        // 
        // RESPONSIBILITIES
        // 
        app.get(this.endpoint + "/responsibilities/:identifier", (req, res) => this.respondWithOkOrNotFound(res,
            this.getResponsibility(req.params.identifier)));

        app.get(this.endpoint + "/responsibilities", (req, res) => this.respondWithOk(res,
            this.getResponsibilities()));

        app.post(this.endpoint + "/responsibilities", jsonParser, (req, res) => this.respondWithNoContent(res,
            this.postResponsibility(req.body)));

        app.put(this.endpoint + "/responsibilities", jsonParser, (req, res) => this.respondWithNoContent(res,
            this.putResponsibility(req.body)));

        app.delete(this.endpoint + "/responsibilities/:identifier", (req, res) => this.respondWithNoContent(res,
            this.deleteResponsibility(req.params.identifier)));

        // 
        // REPLICATIONS
        // 
        app.get(this.endpoint + "/replications/:identifier", (req, res) => this.respondWithOkOrNotFound(res,
            this.getReplication(req.params.identifier)));

        app.get(this.endpoint + "/replications", (req, res) => this.respondWithOk(res,
            this.getReplications()));

        app.post(this.endpoint + "/replications", jsonParser, (req, res) => this.respondWithNoContent(res,
            this.postReplication(req.body)));

        app.put(this.endpoint + "/replications", jsonParser, (req, res) => this.respondWithNoContent(res,
            this.putReplication(req.body)));

        app.delete(this.endpoint + "/replications/:identifier", (req, res) => this.respondWithNoContent(res,
            this.deleteReplication(req.params.identifier)));

        // 
        // DATA
        // 
        app.get(this.endpoint + "/data", (req, res) => this.respondWithOk(res,
            this.getAllData()));

        app.get(this.endpoint + "/data/timestamp/:timestamp", (req, res) => this.respondWithOk(res,
            this.getAllDataSince(req.params.timestamp)));

        app.get(this.endpoint + "/data/timestamp", (req, res) => this.respondWithOk(res,
            this.getMostRecentTimestamp()));

        app.get(this.endpoint + "/data/tag/:tag", (req, res) => this.respondWithOk(res,
            this.getData(req.params.tag)));

        app.get(this.endpoint + "/data/tag/:tag/:timestamp", (req, res) => this.respondWithOk(res,
            this.getDataSince(req.params.tag, req.params.timestamp)));

        app.post(this.endpoint + "/data", jsonParser, (req, res) => this.respondWithNoContent(res,
            this.postData(req.body)));

        app.put(this.endpoint + "/data", jsonParser, (req, res) => this.respondWithNoContent(res,
            this.putData(req.body)));

        app.delete(this.endpoint + "/data/:timestamp", (req, res) => this.respondWithNoContent(res,
            this.deleteData(req.params.timestamp)));
    }

    private respondWithNoContent(res: Response, promise: Promise<void>)
    {
        promise.then(() => res.sendStatus(StatusCode.NoContent))
            .catch(() => res.sendStatus(StatusCode.InternalServerError));
    }

    private respondWithNoContentOrBadRequest(res: Response, promise: Promise<void>)
    {
        promise.then(() => res.sendStatus(StatusCode.NoContent))
            .catch(() => res.sendStatus(StatusCode.BadRequest));
    }

    private respondWithOk(res: Response, promise: Promise<any>)
    {
        promise.then((p: any) => res.status(StatusCode.Ok).json(p))
            .catch(() => res.sendStatus(StatusCode.InternalServerError));
    }

    private respondWithOkOrNoContent(res: Response, promise: Promise<any>)
    {
        promise.then((p: any) =>
        {
            if (p) res.status(StatusCode.Ok).json(p);
            else res.sendStatus(StatusCode.NoContent);
        }).catch(() => res.sendStatus(StatusCode.InternalServerError));
    }

    private respondWithOkOrNotFound(res: Response, promise: Promise<any>)
    {
        promise.then((p: any) =>
        {
            if (p) res.status(StatusCode.Ok).json(p);
            else res.sendStatus(StatusCode.NotFound);
        }).catch(() => res.sendStatus(StatusCode.InternalServerError));
    }

    private respondWithOkOnNumbers(res: Response, argument: any, promise: (key: number) => Promise<any>, upperBound?: number)
    {
        var key = parseInt(argument);

        if (isNaN(key) || (upperBound && key >= upperBound))
            res.sendStatus(StatusCode.BadRequest);
        else
        {
            promise(key).then((p: any) =>
            {
                res.status(StatusCode.Ok).json(p);
            }).catch(() => res.sendStatus(StatusCode.InternalServerError));
        }
    }

    private respondWithNoContentOrBadRequestOnNumbers(res: Response, argument: any, promise: (key: number) => Promise<any>, upperBound?: number)
    {
        var key = parseInt(argument);

        if (isNaN(key) || (upperBound && key >= upperBound))
            res.sendStatus(StatusCode.BadRequest);
        else
        {
            promise(key).then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.BadRequest));
        }
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
        return Helpers.resolvedUnit();
    }

    private setPeer(currentPeer: IPeer, newAddress: string, update: (p: IPeer) => void, ping = true): Promise<void>
    {
        // Does not update the peer if the new peer is the same as the current one.
        if ((currentPeer && currentPeer.address === newAddress) || (!currentPeer && !newAddress))
            return Helpers.resolvedUnit();

        if (newAddress)
        {
            // Sets the peer to this local instance if the new peer is this peer.
            if (newAddress === this.address) update(this);
            //
            // Creates a new remote peer instance and updates the peer.
            else
            {
                var peer = new RemoteChordPeer(newAddress, this.endpoint);

                if (ping) return peer.ping().then(() => update(peer));
                else update(peer);
            }
        }
        else update(null);

        return Helpers.resolvedUnit();
    }

    public getPredecessor(): Promise<string>
    {
        if (this.predecessor) return Helpers.resolvedPromise(this.predecessor.address);
        else return Helpers.resolvedPromise("NONE");
    }

    public setPredecessor(newPredecessor: string = null, ping = true): Promise<void>
    {
        return this.setPeer(this.predecessor, newPredecessor, p =>
        {
            this.predecessor = p;
            this.log("New predecessor is " + (!!p ? p.address : "NONE") + ".");
        }, ping);
    }

    public getSuccessor(index: number): Promise<string>
    {
        return Helpers.resolvedPromise(this.successors[index].address);
    }

    public setSuccessor(index: number, newSuccessor: string, ping = true): Promise<void>
    {
        return this.setPeer(this.successors[index], newSuccessor, p =>
        {
            this.successors[index] = p;
            if (index === 0) this.log("New successor is " + (!!p ? p.address : "NONE") + ".");
        }, ping);
    }

    public getFinger(index: number): Promise<string>
    {
        return Helpers.resolvedPromise(this.fingers[index].address);
    }

    public setFinger(index: number, newFinger: string, ping = true): Promise<void>
    {
        return this.setPeer(this.fingers[index], newFinger, p =>
        {
            this.fingers[index] = p;
            this.log("New finger at " + index + " is " + (!!p ? p.address : "NONE") + ".");
        }, ping);
    }

    public lookup(key: number): Promise<string>
    {
        var deferred = Q.defer<string>();

        if (isNaN(key))
        {
            deferred.reject((void 0));
            return deferred.promise;
        }

        key %= Math.pow(2, Constants.SpaceSize);

        this.log("Looking up " + key);

        if (this.predecessor != null && Helpers.inRangeInclusive(key, this.predecessor.id, this.id))
            deferred.resolve(this.address);

        else if (Helpers.inRangeInclusive(key, this.id, this.successor.id))
            deferred.resolve(this.successor.address);

        else
        {
            this.closestLivingPrecedingNode(key).then(closestPeer =>
            {
                if (closestPeer.id === this.id) deferred.resolve(this.address);
                else closestPeer.lookup(key).then(p => deferred.resolve(p));
            }).catch(() => deferred.reject((void 0)));
        }

        return deferred.promise;
    }

    private closestLivingPrecedingNode(key: number): Promise<IPeer>
    {
        var index = Constants.SpaceSize - 1;
        var candidate: IPeer = null;

        return Helpers.promiseWhile(() => index >= 0 && !candidate, () =>
        {
            if (Helpers.inRangeExclusive(this.fingers[index].id, this.id, key))
                return this.fingers[index].ping().then(() =>
                {
                    candidate = this.fingers[index];
                    index--;
                });
            //
            else return Helpers.resolvedUnit().then(() => index--);
            //
        }).then<IPeer>(() =>
        {
            if (!candidate) candidate = this;
            return Helpers.resolvedPromise(candidate);
        });
    }

    public notify(potentialPredecessor: string): Promise<void>
    {
        var potentialPredecessorId = Helpers.hash(potentialPredecessor);

        if (this.predecessor === null || Helpers.inRangeExclusive(potentialPredecessorId, this.predecessor.id, this.id))
            return this.setPredecessor(potentialPredecessor);

        return Helpers.resolvedUnit();
    }

    public join(knownAddress: string): Promise<void>
    {
        var peer = new RemoteChordPeer(knownAddress, this.endpoint);
        return peer.ping().then<string>(() => peer.lookup(this.id)).then(p => this.resetToSinglePeer(p));
    }

    public leave(): Promise<void>
    {
        if (this.predecessor !== null)
        {
            this.interrupt();

            Q.all([
                this.predecessor.setSuccessor(0, this.successor.address),
                this.successor.setPredecessor(this.predecessor.address)
            ]).then(() => this.run());
        }

        return Helpers.resolvedUnit();
    }

    public getResponsibility(identifier: string): Promise<Responsibility>
    {
        var responsibility = ArrayUtilities.find(this.responsibilities, r => r.identifier === identifier);
        return Helpers.resolvedPromise(responsibility);
    }

    public getResponsibilities(): Promise<Array<Responsibility>>
    {
        return Helpers.resolvedPromise(this.responsibilities);
    }

    public postResponsibility(incomingResponsibility: Responsibility): Promise<void>
    {
        this.responsibilities = this.responsibilities.filter(r => r.identifier !== incomingResponsibility.identifier).concat([ incomingResponsibility ]);
        return Helpers.resolvedUnit();
    }

    public putResponsibility(incomingResponsibility: Responsibility): Promise<void>
    {
        var existingResponbility = ArrayUtilities.find(this.responsibilities, r => r.identifier === incomingResponsibility.identifier);

        if (!existingResponbility)
            this.responsibilities = this.responsibilities.concat([ incomingResponsibility ]);
        else
        {
            this.broker.delegate(RouterMessages.MergeResponsibilities, {
                first: existingResponbility,
                second: incomingResponsibility
            }).then((mergedResponsibility: Responsibility) =>
            {
                this.responsibilities = this.responsibilities.filter(r => r.identifier !== mergedResponsibility.identifier).concat([ mergedResponsibility ]);
            });
        };

        return Helpers.resolvedUnit();
    }

    public deleteResponsibility(identifier: string): Promise<void>
    {
        this.responsibilities = this.responsibilities.filter(r => r.identifier !== identifier);
        return Helpers.resolvedUnit();
    }

    public getReplication(identifier: string): Promise<Responsibility>
    {
        var replication = ArrayUtilities.find(this.replications, r => r.identifier === identifier);
        return Helpers.resolvedPromise(replication);
    }

    public getReplications(): Promise<Array<Responsibility>>
    {
        return Helpers.resolvedPromise(this.replications);
    }

    public postReplication(incomingReplication: Responsibility): Promise<void>
    {
        this.replications = this.replications.filter(r => r.identifier !== incomingReplication.identifier).concat([ incomingReplication ]);
        return Helpers.resolvedUnit();
    }

    public putReplication(incomingReplication: Responsibility): Promise<void>
    {
        var existingReplication = ArrayUtilities.find(this.replications, r => r.identifier === incomingReplication.identifier);

        if (!existingReplication)
            this.replications = this.replications.concat([ incomingReplication ]);
        else
        {
            this.broker.delegate(RouterMessages.MergeResponsibilities, {
                first: existingReplication,
                second: incomingReplication
            }).then((mergedResponsibility: Responsibility) =>
            {
                this.replications = this.replications.filter(r => r.identifier !== mergedResponsibility.identifier).concat([ mergedResponsibility ]);
            });
        };

        return Helpers.resolvedUnit();
    }

    public deleteReplication(identifier: string): Promise<void>
    {
        this.replications = this.replications.filter(r => r.identifier !== identifier);
        return Helpers.resolvedUnit();
    }

    public getAllData(): Promise<Array<Message>>
    {
        var deferred = Q.defer<Array<any>>();

        this.database.find({ }, (error: Error, rows: Array<any>) =>
        {
            deferred.resolve(rows.map((r: any) =>
            {
                var contents = r._contents;
                contents.id = r._id;
                return Message.deserialise(contents);
            }));
        });

        return deferred.promise;
    }

    public getAllDataSince(timestamp: string): Promise<Array<Message>>
    {
        var deferred = Q.defer<Array<any>>();

        this.database.find({
            $where()
            {
                return new Date(this._timestamp) >= new Date(timestamp);
            }
        }, (error: Error, rows: Array<any>) =>
        {
            deferred.resolve(rows.map((r: any) =>
            {
                var contents = r._contents;
                contents.id = r._id;
                return Message.deserialise(contents);
            }));
        });

        return deferred.promise;
    }

    public getData(tag: string): Promise<Array<Message>>
    {
        var deferred = Q.defer<Array<any>>();

        this.database.find({
            $where()
            {
                return ArrayUtilities.contains(this._contents.tags, tag);
            }
        }, (error: Error, rows: Array<any>) => deferred.resolve(rows.map((r: any) =>
        {
            var contents = r._contents;
            contents.id = r._id;
            return Message.deserialise(contents);
        })));

        return deferred.promise;
    }

    public getDataSince(tag: string, timestamp: string): Promise<Array<Message>>
    {
        var deferred = Q.defer<Array<any>>();

        this.database.find({
            $where()
            {
                return ArrayUtilities.contains(this._contents.tags, tag) && new Date(this._timestamp) >= new Date(timestamp);
            }
        }, (error: Error, rows: Array<any>) => deferred.resolve(rows.map((r: any) =>
        {
            var contents = r._contents;
            contents.id = r._id;
            return Message.deserialise(contents);
        })));

        return deferred.promise;
    }

    public getMostRecentTimestamp(): Promise<Date>
    {
        var deferred = Q.defer<Date>();

        this.database.find({ }).sort({ _timestamp: -1 }).limit(1).exec((error: Error, rows: Array<any>) =>
        {
            if (rows && rows.length === 1) deferred.resolve(rows[0]._timestamp);
            else deferred.resolve(new Date(0));
        });

        return deferred.promise;
    }

    public postData(incomingData: Message): Promise<void>
    {
        var data = JSON.parse(JSON.stringify(incomingData));
        delete data["id"];
        this.database.insert(new DataRow(incomingData.id, data, new Date()));

        for (var k = 0; k < this.successors.length; k++)
        {
            if (this.successors[k].address !== this.address)
                this.successors[k].putData(incomingData);
        }

        return Helpers.resolvedUnit();
    }

    public putData(incomingData: Message): Promise<void>
    {
        var data = JSON.parse(JSON.stringify(incomingData));
        delete data["id"];
        this.database.insert(new DataRow(incomingData.id, data, new Date()));
        return Helpers.resolvedUnit();
    }

    public deleteData(timestamp: string): Promise<void>
    {
        this.database.remove({
            $where()
            {
                return new Date(this._timestamp) < new Date(timestamp);
            }
        }, { multi: true });
        return Helpers.resolvedUnit();
    }

    private action(message: string, data: any): Promise<any>
    {
        return this.broker.delegate(message, data);
    }

    private stabilise()
    {
        this.fixSuccessor(0).then<string>(() => this.successor.getPredecessor()).then(p =>
        {
            if (p && Helpers.inRangeExclusive(Helpers.hash(p), this.id, this.successor.id))
                this.setSuccessor(0, p);

            this.successor.notify(this.address);
        });
    }

    private checkPredecessor()
    {
        if (this.predecessor)
        {
            this.predecessor.ping().catch(() =>
            {
                this.log("Predecessor has failed.");
                this.setPredecessor();
            });
        }
    }

    private fixFingers()
    {
        this.fixFinger(this.currentFingerFixed)
            .catch(() => this.setFinger(this.currentFingerFixed, this.successor.address))
            .done(() => { this.currentFingerFixed = (this.currentFingerFixed + 1) % Constants.SpaceSize; });
    }

    private fixFinger(index: number): Promise<void>
    {
        return this.lookup(this.id + Math.pow(2, index)).then<void>(p =>
        {
            this.log("Fixing finger " + index);
            this.setFinger(index, p);
        });
    }

    private fixSuccessors()
    {
        this.fixSuccessor(this.currentSuccessorFixed)
            .done(() => { this.currentSuccessorFixed = (this.currentSuccessorFixed + 1) % Constants.SuccessorsCount; });
    }

    private fixSuccessor(index: number): Promise<void>
    {
        var deferred = Q.defer<void>();

        if (index === 0)
        {
            this.successor.ping().then(() => deferred.resolve((void 0))).catch(() =>
            {
                this.log("Successor has failed.");
                this.findLivingSuccessor()
                    .then(s => this.setSuccessor(0, s.address, false).then(() => deferred.resolve((void 0))));
            });
        }
        else if (this.successors[index - 1].id === this.id)
            this.setSuccessor(index, this.successor.address).then(() => deferred.resolve((void 0)));
        else
        {
            this.successors[index - 1].ping().then<string>(() => this.successors[index - 1].getSuccessor(0)).then(p =>
            {
                this.setSuccessor(index, p);
                deferred.resolve((void 0));
            }).catch(() => index = 0);
        }

        return deferred.promise;
    }

    private findLivingSuccessor(index: number = 1): Promise<IPeer>
    {
        if (index < Constants.SuccessorsCount)
        {
            var deferred = Q.defer<IPeer>();

            this.successors[index].ping()
                .then(() => deferred.resolve(this.successors[index]))
                .catch(() => this.findLivingSuccessor(index + 1).then(p => deferred.resolve(p)));

            return deferred.promise;
        }
        else
            return Helpers.resolvedPromise(this);
    }

    private checkResponsibilities()
    {
        for (var i = this.responsibilities.length - 1; i >= 0; i--)
        {
            ((responsibility: Responsibility) =>
            {
                this.lookup(Helpers.hash(responsibility.identifier)).then(p =>
                {
                    // This peer is no longer responsible and re-assigns the responsibility to the responsible peer.
                    if (p !== this.address)
                    {
                        var peer = new RemoteChordPeer(p, this.endpoint);

                        peer.putResponsibility(responsibility);
                        this.deleteResponsibility(responsibility.identifier);
                    }
                    // This peer is still responsible and pushes replications to its successors.
                    else
                    {
                        for (var j = 0; j < this.successors.length; j++)
                        {
                            if (this.successors[j].address !== this.address)
                                this.successors[j].postReplication(responsibility);
                        }
                    }
                });
            })(this.responsibilities[i]);
        }
    }

    private checkReplications()
    {
        this.replications = ArrayUtilities.except(this.replications, this.responsibilities);

        for (var i = this.replications.length - 1; i >= 0; i--)
        {
            ((replication: Responsibility) =>
            {
                this.lookup(Helpers.hash(replication.identifier)).then(p =>
                {
                    // This peer is now responsible and promotes the replication to a responsibility.
                    if (p === this.address)
                    {
                        this.postResponsibility(replication);
                        this.deleteReplication(replication.identifier);
                    }
                });
            })(this.replications[i]);
        }
    }

    private synchroniseData()
    {
        this.pull();
        this.push();
    }

    private pull()
    {
        this.getMostRecentTimestamp().then(timestamp =>
        {
            for (var j = 0; j < this.successors.length; j++)
            {
                if (this.successors[j].address !== this.address)
                {
                    this.successors[j].getAllDataSince(timestamp.toString())
                        .then(messages => messages.forEach(m => this.putData(m)));
                }
            }
        });
    }

    private push()
    {
        for (var i = 0; i < this.successors.length; i++)
        {
            ((s: IPeer) =>
            {
                if (s.address !== this.address)
                {
                    s.getMostRecentTimestamp().then(timestamp =>
                    {
                        this.getAllDataSince(timestamp.toString()).then(messages => messages.forEach(m => s.putData(m)));
                    });
                }
            })(this.successors[i]);
        }
    }

    private sendHeartbeat()
    {
        this.broker.delegate(RouterMessages.Heartbeat, null);
    }

    private resetToSinglePeer(knownPeer: string)
    {
        var i: number;
        this.setPredecessor();

        for (i = 0; i < Constants.SuccessorsCount; i++)
            this.setSuccessor(i, knownPeer);

        for (i = 0; i < Constants.SpaceSize; i++)
            this.setFinger(i, knownPeer);

        this.currentFingerFixed = 0;
        this.currentSuccessorFixed = 0;
    }

    private log(message: string)
    {
        if (this.isLogging)
            console.log(message);
    }

    private interrupt()
    {
        clearInterval(this.stabiliseInterval);
        clearInterval(this.checkPredecessorInterval);
        clearInterval(this.fixFingersInterval);
        clearInterval(this.fixSuccessorsInterval);
        clearInterval(this.checkResponsibilitiesInterval);
        clearInterval(this.checkReplicationsInterval);
        clearInterval(this.synchroniseDataInterval);
        clearInterval(this.heartbeatInterval);
    }

    public run()
    {
        this.log("Chord peer running at " + this.address + "\n");
        this.resetToSinglePeer(this.address);

        var numberOfIntervals = 8;

        setTimeout(() => this.stabiliseInterval = setInterval(() => this.stabilise(), Constants.StabiliseInterval), 0 * Constants.StabiliseInterval / numberOfIntervals);
        setTimeout(() => this.checkPredecessorInterval = setInterval(() => this.checkPredecessor(), Constants.StabiliseInterval), 1 * Constants.StabiliseInterval / numberOfIntervals);
        setTimeout(() => this.fixFingersInterval = setInterval(() => this.fixFingers(), Constants.StabiliseInterval), 2 * Constants.StabiliseInterval / numberOfIntervals);
        setTimeout(() => this.fixSuccessorsInterval = setInterval(() => this.fixSuccessors(), Constants.StabiliseInterval), 3 * Constants.StabiliseInterval / numberOfIntervals);
        setTimeout(() => this.checkResponsibilitiesInterval = setInterval(() => this.checkResponsibilities(), Constants.StabiliseInterval), 4 * Constants.StabiliseInterval / numberOfIntervals);
        setTimeout(() => this.checkReplicationsInterval = setInterval(() => this.checkReplications(), Constants.StabiliseInterval), 5 * Constants.StabiliseInterval / numberOfIntervals);
        setTimeout(() => this.synchroniseDataInterval = setInterval(() => this.synchroniseData(), Constants.StabiliseInterval), 6 * Constants.StabiliseInterval / numberOfIntervals);
        setTimeout(() => this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), Constants.StabiliseInterval), 7 * Constants.StabiliseInterval / numberOfIntervals);
    }
}

export = LocalChordPeer;