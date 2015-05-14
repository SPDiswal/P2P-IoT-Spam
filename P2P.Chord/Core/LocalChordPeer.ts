// TODO Replicate data.

/// <reference path="../Scripts/typings/nedb/nedb.d.ts" />

import BodyParser = require("body-parser");
import Express = require("express");
//import File = require("fs");
import NeDB = require("nedb");
import Q = require("q");

import Application = Express.Application;
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
    private heartbeatInterval: any;

    private responsibilities: Array<Responsibility> = [ ];
    private replications: Array<Responsibility> = [ ];

    private database: NeDB;

    constructor(app: Application, private broker: IBroker, private _address: string, private endpoint: string, private isLogging = false)
    {
        if (endpoint.length > 0 && endpoint[0] !== "/") this.endpoint = "/" + endpoint;
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

        app.get(this.endpoint + "/lookup/:key", (req, res) =>
        {
            var key = parseInt(req.params.key);

            if (isNaN(key))
                res.sendStatus(StatusCode.BadRequest);
            else
            {
                this.lookup(key)
                    .then(p => res.status(StatusCode.Ok).json({ peer: p }))
                    .catch(() => res.sendStatus(StatusCode.InternalServerError));
            }
        });

        app.get(this.endpoint + "/predecessor", (req, res) =>
        {
            this.getPredecessor()
                .then(p => res.status(StatusCode.Ok).json({ peer: p }))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.put(this.endpoint + "/predecessor/:address", (req, res) =>
        {
            this.setPredecessor(req.params.address)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.BadRequest));
        });

        app.get(this.endpoint + "/successor", (req, res) =>
        {
            this.getSuccessor(0)
                .then(p => res.status(StatusCode.Ok).json({ peer: p }))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.put(this.endpoint + "/successor/:address", (req, res) =>
        {
            this.setSuccessor(0, req.params.address)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.BadRequest));
        });

        app.get(this.endpoint + "/successors/:index", (req, res) =>
        {
            var index = parseInt(req.params.index);

            if (isNaN(index) || index >= Constants.SuccessorsCount)
                res.sendStatus(StatusCode.BadRequest);
            else
            {
                this.getSuccessor(index)
                    .then(p => res.status(StatusCode.Ok).json({ peer: p }))
                    .catch(() => res.sendStatus(StatusCode.InternalServerError));
            }
        });

        app.put(this.endpoint + "/successors/:index/:address", (req, res) =>
        {
            var index = parseInt(req.params.index);

            if (isNaN(index) || index >= Constants.SpaceSize)
                res.sendStatus(StatusCode.BadRequest);
            else
            {
                this.setSuccessor(index, req.params.address)
                    .then(() => res.sendStatus(StatusCode.NoContent))
                    .catch(() => res.sendStatus(StatusCode.BadRequest));
            }
        });

        app.get(this.endpoint + "/fingers/:index", (req, res) =>
        {
            var index = parseInt(req.params.index);

            if (isNaN(index) || index >= Constants.SpaceSize)
                res.sendStatus(StatusCode.BadRequest);
            else
            {
                this.getFinger(index)
                    .then(p => res.status(StatusCode.Ok).json({ peer: p }))
                    .catch(() => res.sendStatus(StatusCode.InternalServerError));
            }
        });

        app.put(this.endpoint + "/fingers/:index/:address", (req, res) =>
        {
            var index = parseInt(req.params.index);

            if (isNaN(index) || index >= Constants.SpaceSize)
                res.sendStatus(StatusCode.BadRequest);
            else
            {
                this.setFinger(index, req.params.address)
                    .then(() => res.sendStatus(StatusCode.NoContent))
                    .catch(() => res.sendStatus(StatusCode.BadRequest));
            }
        });

        app.get(this.endpoint + "/ping", (req, res) =>
        {
            this.ping()
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.post(this.endpoint + "/notify/:address", (req, res) =>
        {
            this.notify(req.params.address)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.post(this.endpoint + "/join/:address", (req, res) =>
        {
            this.join(req.params.address)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.post(this.endpoint + "/leave", (req, res) =>
        {
            this.leave()
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.get(this.endpoint + "/action/:message", jsonParser, (req, res) =>
        {
            this.action(req.params.message, req.body)
                .then((r: any) => res.status(StatusCode.Ok).json(r))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.post(this.endpoint + "/action/:message", jsonParser, (req, res) =>
        {
            this.action(req.params.message, req.body)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.put(this.endpoint + "/action/:message", jsonParser, (req, res) =>
        {
            this.action(req.params.message, req.body)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.delete(this.endpoint + "/action/:message", jsonParser, (req, res) =>
        {
            this.action(req.params.message, req.body)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.get(this.endpoint + "/responsibilities/:identifier", (req, res) =>
        {
            this.getResponsibility(req.params.identifier).then(p =>
                {
                    if (p !== null) res.status(StatusCode.Ok).json(p);
                    else res.sendStatus(StatusCode.NotFound);
                }
            ).catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.get(this.endpoint + "/responsibilities", (req, res) =>
        {
            this.getResponsibilities()
                .then(p => res.status(StatusCode.Ok).json(p))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.post(this.endpoint + "/responsibilities", jsonParser, (req, res) =>
        {
            this.postResponsibility(req.body)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.put(this.endpoint + "/responsibilities", jsonParser, (req, res) =>
        {
            this.putResponsibility(req.body)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.delete(this.endpoint + "/responsibilities/:identifier", (req, res) =>
        {
            this.deleteResponsibility(req.params.identifier)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.get(this.endpoint + "/replications/:identifier", (req, res) =>
        {
            this.getReplication(req.params.identifier).then(p =>
                {
                    if (p !== null) res.status(StatusCode.Ok).json(p);
                    else res.sendStatus(StatusCode.NotFound);
                }
            ).catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.get(this.endpoint + "/replications", (req, res) =>
        {
            this.getReplications()
                .then(p => res.status(StatusCode.Ok).json(p))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.post(this.endpoint + "/replications", jsonParser, (req, res) =>
        {
            this.postReplication(req.body)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.put(this.endpoint + "/replications", jsonParser, (req, res) =>
        {
            this.putReplication(req.body)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.delete(this.endpoint + "/replications/:identifier", (req, res) =>
        {
            this.deleteReplication(req.params.identifier)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.get(this.endpoint + "/data", (req, res) =>
        {
            this.getAllData()
                .then(messages => res.status(StatusCode.Ok).json(messages))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.get(this.endpoint + "/data/:tag", (req, res) =>
        {
            this.getData(req.params.tag)
                .then(messages => res.status(StatusCode.Ok).json(messages))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.get(this.endpoint + "/data/:tag/:timestamp", (req, res) =>
        {
            this.getDataSince(req.params.tag, new Date(req.params.timestamp))
                .then(messages => res.status(StatusCode.Ok).json(messages))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.put(this.endpoint + "/data", jsonParser, (req, res) =>
        {
            this.putData(req.body)
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });

        app.delete(this.endpoint + "/data/:timestamp", (req, res) =>
        {
            this.deleteData(new Date(req.params.timestamp))
                .then(() => res.sendStatus(StatusCode.NoContent))
                .catch(() => res.sendStatus(StatusCode.InternalServerError));
        });
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

    public getPredecessor(): Promise<string>
    {
        if (this.predecessor) return Helpers.resolvedPromise(this.predecessor.address);
        else return Helpers.resolvedPromise("NONE");
    }

    public setPredecessor(newPredecessor: string = null, ping = true): Promise<void>
    {
        if ((this.predecessor && newPredecessor === this.predecessor.address)
            || (!newPredecessor && !this.predecessor))
            return Helpers.resolvedUnit();

        if (newPredecessor)
        {
            if (newPredecessor === this.address)
            {
                this.predecessor = this;
                this.log("New predecessor is " + this.address + ".");
                return Helpers.resolvedUnit();
            }

            var peer = new RemoteChordPeer(newPredecessor, this.endpoint);

            if (ping)
            {
                var deferred = Q.defer<void>();

                peer.ping().then(() =>
                {
                    this.predecessor = peer;
                    this.log("New predecessor is " + peer.address + ".");
                    deferred.resolve((void 0));
                }).catch(() => deferred.reject((void 0)));

                return deferred.promise;
            }

            this.predecessor = peer;
            return Helpers.resolvedUnit();
        }

        this.predecessor = null;
        this.log("New predecessor is NONE.");
        return Helpers.resolvedUnit();
    }

    public getSuccessor(index: number): Promise<string>
    {
        return Helpers.resolvedPromise(this.successors[index].address);
    }

    public setSuccessor(index: number, newSuccessor: string, ping = true): Promise<void>
    {
        if (this.successors[index] && newSuccessor === this.successors[index].address)
            return Helpers.resolvedUnit();

        if (newSuccessor === this.address)
        {
            this.successors[index] = this;
            if (index === 0) this.log("New successor is " + this.address + ".");
            return Helpers.resolvedUnit();
        }

        var peer = new RemoteChordPeer(newSuccessor, this.endpoint);

        if (ping)
        {
            var deferred = Q.defer<void>();

            peer.ping().then(() =>
            {
                this.successors[index] = peer;
                if (index === 0) this.log("New successor is " + peer.address + ".");

                deferred.resolve((void 0));
            }).catch(() => deferred.reject((void 0)));

            return deferred.promise;
        }

        this.successors[index] = peer;
        if (index === 0) this.log("New successor is " + peer.address + ".");
        return Helpers.resolvedUnit();
    }

    public getFinger(index: number): Promise<string>
    {
        return Helpers.resolvedPromise(this.fingers[index].address);
    }

    public setFinger(index: number, newFinger: string, ping = true): Promise<void>
    {
        if (this.fingers[index] && newFinger === this.fingers[index].address)
            return Helpers.resolvedUnit();

        if (newFinger === this.address)
        {
            this.fingers[index] = this;
            return Helpers.resolvedUnit();
        }

        var peer = new RemoteChordPeer(newFinger, this.endpoint);

        if (ping)
        {
            var deferred = Q.defer<void>();

            peer.ping().then(() =>
            {
                this.fingers[index] = peer;
                deferred.resolve((void 0));
            }).catch(() => deferred.reject((void 0)));

            return deferred.promise;
        }

        this.fingers[index] = peer;
        return Helpers.resolvedUnit();
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

    private closestLivingPrecedingNode(key: number, index: number = Constants.SpaceSize - 1): Promise<IPeer>
    {
        if (index >= 0)
        {
            if (Helpers.inRangeExclusive(this.fingers[index].id, this.id, key))
            {
                var deferred = Q.defer<IPeer>();

                this.fingers[index].ping()
                    .then(() => deferred.resolve(this.fingers[index]))
                    .catch(() => this.closestLivingPrecedingNode(key, index - 1).then(p => deferred.resolve(p)));

                return deferred.promise;
            }
            else
                return this.closestLivingPrecedingNode(key, index - 1);
        }
        else
            return Helpers.resolvedPromise(this);
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
        var deferred = Q.defer<void>();
        var peer = new RemoteChordPeer(knownAddress, this.endpoint);

        peer.ping().then<string>(() => peer.lookup(this.id)).then(p =>
        {
            this.resetToSinglePeer(p);
            deferred.resolve((void 0));
        }).catch(() => deferred.reject((void 0)));

        return deferred.promise;
    }

    public leave(): Promise<void>
    {
        if (this.predecessor !== null)
        {
            this.interrupt();

            this.predecessor.setSuccessor(0, this.successor.address).then(() =>
            {
                this.successor.setPredecessor(this.predecessor.address).then(() =>
                {
                    this.run();
                });
            });
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

    public getDataSince(tag: string, timestamp: Date): Promise<Array<Message>>
    {
        var deferred = Q.defer<Array<any>>();

        this.database.find({
            $where()
            {
                return ArrayUtilities.contains(this._contents.tags, tag) && this._timestamp >= timestamp;
            }
        }, (error: Error, rows: Array<any>) => deferred.resolve(rows.map((r: any) =>
        {
            var contents = r._contents;
            contents.id = r._id;
            return Message.deserialise(contents);
        })));

        return deferred.promise;
    }

    public putData(incomingData: Message): Promise<void>
    {
        var data = JSON.parse(JSON.stringify(incomingData));
        delete data["id"];
        this.database.insert(new DataRow(incomingData.id, data, new Date()));
        return Helpers.resolvedUnit();
    }

    public deleteData(timestamp: Date): Promise<void>
    {
        this.database.remove({ _timestamp: { $lt: timestamp } }, { multi: true });
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
            if (p !== null && Helpers.inRangeExclusive(Helpers.hash(p), this.id, this.successor.id))
                this.setSuccessor(0, p);

            this.successor.notify(this.address);
        });
    }

    private checkPredecessor()
    {
        if (this.predecessor !== null)
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
        this.fixFinger(this.currentFingerFixed).then(() => { this.currentFingerFixed = (this.currentFingerFixed + 1) % Constants.SpaceSize; });
    }

    private fixFinger(index: number): Promise<void>
    {
        var deferred = Q.defer<void>();

        this.lookup(this.id + Math.pow(2, index)).then(p =>
        {
            //            this.log("Fixing finger " + index);
            this.setFinger(index, p);
            deferred.resolve((void 0));
        }).catch(() => this.setFinger(index, this.successor.address));

        return deferred.promise;
    }

    private fixSuccessors()
    {
        this.fixSuccessor(this.currentSuccessorFixed).then(() => { this.currentSuccessorFixed = (this.currentSuccessorFixed + 1) % Constants.SuccessorsCount; });
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
            ((j: number) =>
            {
                this.lookup(Helpers.hash(this.responsibilities[j].identifier)).then(r =>
                {
                    if (r !== this.address)
                    {
                        var peer = new RemoteChordPeer(r, this.endpoint);

                        peer.putResponsibility(this.responsibilities[j]);
                        this.deleteResponsibility(this.responsibilities[j].identifier);
                    }
                    else
                    {
                        for (var k = 0; k < this.successors.length; k++)
                            this.successors[k].postReplication(this.responsibilities[j]);
                    }
                });
            })(i);
        }
    }

    private checkReplications()
    {
        // TODO Merge database of replicating peers with own database to ensure up-to-date contents

        this.replications = ArrayUtilities.except(this.replications, this.responsibilities);

        for (var i = this.replications.length - 1; i >= 0; i--)
        {
            ((j: number) =>
            {
                this.lookup(Helpers.hash(this.replications[j].identifier)).then(r =>
                {
                    if (r === this.address)
                    {
                        this.postResponsibility(this.replications[j]);
                        this.deleteReplication(this.replications[j].identifier);
                    }
                });
            })(i);
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
    }

    private log(message: string)
    {
        if (this.isLogging)
            console.log(message);
    }

    private interrupt()
    {
        clearInterval(this.stabiliseInterval);
        clearInterval(this.fixFingersInterval);
        clearInterval(this.fixSuccessorsInterval);
        clearInterval(this.checkPredecessorInterval);
        clearInterval(this.checkResponsibilitiesInterval);
        clearInterval(this.checkReplicationsInterval);
        clearInterval(this.heartbeatInterval);
    }

    public run()
    {
        this.log("Chord peer running at " + this.address + "\n");
        this.resetToSinglePeer(this.address);

        var numberOfIntervals = 7;

        this.stabiliseInterval = setInterval(() => this.stabilise(), Constants.StabiliseInterval);
        this.checkPredecessorInterval = setTimeout(() => setInterval(() => this.checkPredecessor(), Constants.StabiliseInterval), 1 * Constants.StabiliseInterval / numberOfIntervals);
        this.fixFingersInterval = setTimeout(() => setInterval(() => this.fixFingers(), Constants.StabiliseInterval), 2 * Constants.StabiliseInterval / numberOfIntervals);
        this.fixSuccessorsInterval = setTimeout(() => setInterval(() => this.fixSuccessors(), Constants.StabiliseInterval), 3 * Constants.StabiliseInterval / numberOfIntervals);
        this.checkResponsibilitiesInterval = setTimeout(() => setInterval(() => this.checkResponsibilities(), Constants.StabiliseInterval), 4 * Constants.StabiliseInterval / numberOfIntervals);
        this.checkReplicationsInterval = setTimeout(() => setInterval(() => this.checkReplications(), Constants.StabiliseInterval), 5 * Constants.StabiliseInterval / numberOfIntervals);
        this.heartbeatInterval = setTimeout(() => setInterval(() => this.sendHeartbeat(), Constants.StabiliseInterval), 6 * Constants.StabiliseInterval / numberOfIntervals);
    }
}

export = LocalChordPeer;

//    private insertStatement: SQLite.Statement;
//    private insertWithTimestampStatement: SQLite.Statement;
//    private selectStatement: SQLite.Statement;
//    private selectSinceStatement: SQLite.Statement;
//    private selectLastTimestampStatement: SQLite.Statement;
//    private deleteStatement: SQLite.Statement;
//
//    private createSql = "CREATE TABLE IF NOT EXISTS Messages (Id VARCHAR(255), Contents TEXT, Tags TEXT, Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(Id))";
//    private insertSql = "INSERT OR IGNORE INTO Messages (Id, Contents, Tags) VALUES (?, ?, ?)";
//    private insertWithTimestampSql = "INSERT OR IGNORE INTO Messages (Id, Contents, Tags, Timestamp) VALUES (?, ?, ?, ?)";
//    private selectSql = "SELECT Id, Contents, Tags, Timestamp FROM Messages WHERE ? IN Tags ORDER BY Timestamp";
//    private selectSinceSql = "SELECT Id, Contents, Tags, Timestamp FROM Messages WHERE ? IN Tags AND DATETIME(Timestamp) >= ? ORDER BY Timestamp";
//    private selectLastTimestampSql = "SELECT Timestamp FROM Messages WHERE ? IN Tags ORDER BY Timestamp DESC LIMIT 1";
//    private deleteSql = "DELETE FROM Messages WHERE DATETIME(Timestamp) < ?";
//
//    private messagesTable = "CREATE TABLE IF NOT EXISTS Messages (Id VARCHAR(255), Contents TEXT, Tags TEXT, Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(Id))";
//    private tagsTable = "CREATE TABLE IF NOT EXISTS Tags (TagName TEXT, UNIQUE(Id))";
//
//    // Sets up SQLite database.
//    var dataPath = __dirname + "/Data/" + Helpers.hash(address) + ".db";
//
//    if (!File.existsSync(dataPath))
//        File.openSync(dataPath, "w");
//
//    var db = new SQLite.Database(dataPath);
//
//    this.insertStatement = db.prepare(this.insertSql);
//    this.insertWithTimestampStatement = db.prepare(this.insertWithTimestampSql);
//    this.selectStatement = db.prepare(this.selectSql);
//    this.selectSinceStatement = db.prepare(this.selectSinceSql);
//    this.selectLastTimestampStatement = db.prepare(this.selectLastTimestampSql);
//    this.deleteStatement = db.prepare(this.deleteSql);
//
//    db.run(this.createSql,() => {
//        // Launches the chord service locally on the given port.
//        app.listen(port, host,() => chord.goLive());
//    });
//    
//    public listFingers(req: Express.Request, res: Express.Response)
//    {
//        res.status(200).json({
//            mostRecentlyFixedFinger: this.currentFingerFixed,
//            mostRecentlyFixedSuccessor: this.currentSuccessorFixed,
//            fingers: this.fingers,
//            successors: this.successorList
//        });
//    }
//
//    public findTag(tag: string)
//    {
//        var tags = this.tagResponsibilities.filter(t => (t === tag));
//        return tags.length === 0 ? null : tags[0];
//    }
//
//    public listTags(req: Express.Request, res: Express.Response)
//    {
//        res.status(200).json({ tags: this.tagResponsibilities });
//    }
//
//    public readMessagesOfTagSince(req: Express.Request, res: Express.Response)
//    {
//        var tag = req.params.tag;
//        var id = Helpers.hash(tag);
//        var timestamp = req.params.timestamp;
//
////        console.log("-> Reading resource " + name + " since " + timestamp);
//
//        this.findSuccessor(id).then(r =>
//        {
//            var responsiblePeer = new Peer(r.response.result);
//
//            if (responsiblePeer.id === this.self.id)
//            {
//                var rows: Array<IDataRow> = [ ];
//                this.selectSinceStatement.bind(tag, timestamp).each((err: any, row: IDataRow) => rows.push(row), () => res.status(200).json(rows));
//            }
//            else
//            {
//                responsiblePeer.retrieveMessagesSince(tag, timestamp).then(result =>
//                {
//                    if (result.statusCode === 200)
//                        res.status(200).json(result.response);
//                    else
//                        res.sendStatus(result.statusCode);
//                });
//            }
//        });
//    }
//
//    public readAllMessagesOfTag(req: Express.Request, res: Express.Response)
//    {
//        var tag = req.params.tag;
//        var id = Helpers.hash(tag);
//
////        console.log("-> Reading resource " + tag);
//
//        this.findSuccessor(id).then(r =>
//        {
//            var responsiblePeer = new Peer(r.response.result);
//
//            if (responsiblePeer.id === this.self.id)
//            {
//                if (this.findTag(tag) !== null)
//                {
//                    var rows: Array<IDataRow> = [ ];
//
//                    this.selectStatement.bind(tag).each((err: any, row: IDataRow) =>
//                    {
//                        rows.push(row);
//                    }, () =>
//                    {
//                        res.status(200).json(rows);
//                    });
//                }
//                else
//                    res.status(200).json(<any>[ ]);
//            }
//            else
//            {
//                responsiblePeer.retrieveAllMessages(tag).then(result =>
//                {
//                    if (result.statusCode === 200)
//                        res.status(200).json(result.response);
//                    else
//                        res.sendStatus(result.statusCode);
//                });
//            }
//        });
//    }
//
//    public storeMessage(req: Express.Request, res: Express.Response)
//    {
//        var body = req.body;
//
//        if (typeof body.name === "undefined" || typeof body.url === "undefined")
//        {
//            res.sendStatus(400);
//            return;
//        }
//
//        var id = body.id;
//        var contents = body.contents;
//        var tags = body.tagResponsibilities;
//
////        console.log("-> Registering resource " + name);
//
//        this.tagResponsibilities = this.tagResponsibilities.filter(item => (!(item.name === name)));
//        this.tagResponsibilities.push(<string>
//        {
//            name: name,
//            id: id,
//            url: url,
//            primary: primary
//        });
//
//        if (initialData !== null && typeof initialData !== "undefined")
//        {
//            for (var i = 0; i < initialData.length; i++)
//                this.insertWithTimestampStatement.run(initialData[i].Peer, name, initialData[i].Value, initialData[i].Timestamp);
//        }
//
//        for (i = 0; i < Constants.SuccessorListCount; i++)
//        {
//            ((j: number) =>
//            {
//                this.successorList[j].replicate(this.findResource(name));
//            })(i);
//        }
//
//        res.sendStatus(204);
//    }
//
//    public removeResource(req: Express.Request, res: Express.Response)
//    {
//        var name = req.params.name;
//
//        console.log("-> Removing resource " + name);
//
//        this.resources = this.resources.filter(item => (!(item.name === name)));
//        this.deleteStatement.run(name);
//
//        res.sendStatus(204);
//    }
//
//    public listReplications(req: Express.Request, res: Express.Response)
//    {
//        res.status(200).json({ replications: this.replications });
//    }
//
//    public registerReplication(req: Express.Request, res: Express.Response)
//    {
//        var body = req.body;
//        var name = body.name;
//        var id = Helpers.hash(body.name);
//        var url = body.url;
//        var primary = body.primary;
//
//        console.log("-> Registering replicated resource " + name);
//
//        this.replications = this.replications.filter(item => (!(item.name === name)));
//        this.replications.push(<IResource>
//        {
//            name: name,
//            id: id,
//            url: url,
//            primary: primary
//        });
//
//        res.sendStatus(204);
//    }
//
//    private checkResources()
//    {
//        if (this.moveTagResponsibilityTimeout > 0)
//            this.moveTagResponsibilityTimeout--;
//        else
//        {
//            for (var i = this.tagResponsibilities.length - 1; i >= 0; i--)
//            {
//                ((j: number) =>
//                {
//                    this.findSuccessor(Helpers.hash(this.tagResponsibilities[j])).then(r =>
//                    {
//                        var responsiblePeer = new Peer(r.response.result);
//
//                        if (responsiblePeer.id !== this.self.id)
//                            this.moveTagResponsibility(responsiblePeer, this.tagResponsibilities[j]);
//                    });
//                })(i);
//            }
//        }
//    }
//
//    private moveTagResponsibility(targetPeer: Peer, tag: string)
//    {
////        console.log("Moving resource " + resource.name + " to " + targetPeer.address + "...");
//
//        var rows: Array<IDataRow> = [ ];
//
//        this.selectStatement.bind(tag).each((err: any, row: IDataRow) =>
//        {
//            rows.push(row);
//        }, () =>
//        {
//            tag.initialData = rows;
//            targetPeer.registerResource(tag).then(() => { this.self.removeResource(tag.name); });
//        });
//    }
//
//    private snapshot()
//    {
//        for (var i = 0; i < this.resources.length; i++)
//        {
//            ((j: number) =>
//            {
//                new RequestDispatcher().get(this.resources[j].url).then(r =>
//                {
//                    var data = r.response;
//
//                    for (var c = 0; c < this.resources[j].primary.length; c++)
//                    {
//                        if (!data.hasOwnProperty(this.resources[j].primary[c]))
//                            data = { };
//                        else
//                            data = data[this.resources[j].primary[c]];
//                    }
//
//                    this.insertStatement.run(this.self.address, this.resources[j].name, JSON.stringify(data));
//                });
//            })(i);
//        }
//
//        for (i = this.replications.length - 1; i >= 0; i--)
//        {
//            ((j: number) =>
//            {
//                this.findSuccessor(this.replications[j].id).then((r: IResponse) =>
//                {
//                    var responsiblePeer = new Peer(r.response.result);
//
//                    if (responsiblePeer.id === this.self.id)
//                    {
//                        this.resources = this.resources.filter(item => (!(item.name === this.replications[j].name)));
//                        this.resources.push(<IResource>
//                        {
//                            name: this.replications[j].name,
//                            id: this.replications[j].id,
//                            url: this.replications[j].url,
//                            primary: this.replications[j].primary
//                        });
//                        this.replications = this.replications.filter(item => (!(item.name === this.replications[j].name)));
//                    }
//                    else
//                    {
//                        var lastTimestamp: Date;
//                        this.selectLastTimestampStatement.bind(this.replications[j].name).each((err: any, row: IDataRow) => lastTimestamp = row.timestamp, () =>
//                        {
//                            var promise: Q.Promise<IResponse>;
//
//                            if (typeof lastTimestamp !== "undefined")
//                                promise = responsiblePeer.readResourceSince(this.replications[j].name, lastTimestamp.toString());
//                            else
//                                promise = responsiblePeer.readResourceAll(this.replications[j].name);
//
//                            promise.then(result =>
//                            {
//                                if (result.statusCode === 200)
//                                {
//                                    var data = result.response;
//
//                                    for (var c = 0; c < data.length; c++)
//                                        this.insertWithTimestampStatement.run(data[c].Peer, this.replications[j].name, data[c].Value, data[c].Timestamp);
//                                }
//                            });
//                        });
//                    }
//                });
//            })(i);
//        }
//    }
//}