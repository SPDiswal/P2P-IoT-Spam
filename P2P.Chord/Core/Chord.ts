import BodyParser = require("body-parser");
import Express = require("express");
import File = require("fs");
import Q = require("q");
import SQLite = require("sqlite3");

import Constants = require("./Constants");
import Helpers = require("../Utilities/Helpers");
import Peer = require("./Peer");
import RequestDispatcher = require("../Utilities/RequestDispatcher");
import IResponse = require("../Interfaces/IResponse");

class Chord
{
    // Topology.
    private self: Peer;
    private predecessor: Peer;
    private successor: Peer;
    private fingers: Array<Peer>;
    private successorList: Array<Peer>;

    // Finger fixing.
    private currentFingerFixed = 0;
    private isCurrentlyFixingFinger = false;

    // Successor list fixing.
    private currentSuccessorFixed = 0;
    private isCurrentlyFixingSuccessor = false;

    // Periodic function invocations.
    private stabiliseInterval: any;
    private checkPredecessorInterval: any;
    private fixFingersInterval: any;
    private fixSuccessorListInterval: any;
    private snapshotInterval: any;

    // Resources.
    private resources: Array<IResource> = [ ];
    private replications: Array<IResource> = [ ];

    private moveResourceTimeout = 0;

    // Database.
    private insertStatement: SQLite.Statement;
    private insertWithTimestampStatement: SQLite.Statement;
    private selectStatement: SQLite.Statement;
    private selectSinceStatement: SQLite.Statement;
    private selectLastTimestampStatement: SQLite.Statement;
    private deleteStatement: SQLite.Statement;

    private insertSql = "INSERT OR IGNORE INTO Snapshots (Peer, Name, Value) VALUES (?, ?, ?)";
    private insertWithTimestampSql = "INSERT OR IGNORE INTO Snapshots (Peer, Name, Value, Timestamp) VALUES (?, ?, ?, ?)";
    private selectSql = "SELECT Peer, Value, Timestamp FROM Snapshots WHERE Name = ? ORDER BY Timestamp";
    private selectSinceSql = "SELECT Peer, Value, Timestamp FROM Snapshots WHERE Name = ? AND DATETIME(Timestamp) >= ? ORDER BY Timestamp";
    private selectLastTimestampSql = "SELECT Timestamp FROM Snapshots WHERE Name = ? ORDER BY Timestamp DESC LIMIT 1";
    private deleteSql = "DELETE FROM Snapshots WHERE Name = ?";

    constructor(address: string)
    {
        this.self = new Peer(address);
        this.fingers = [ ];
        this.successorList = [ ];
    }

    public lookup(req: Express.Request, res: Express.Response)
    {
        var key = parseInt(req.params.key);
        console.log("-> " + Helpers.sender(req) + " has asked me to look up " + req.params.key + ".");

        this.findSuccessor(key).then((r: IResponse) =>
        {
            var responsiblePeer = r.response.result;
            console.log("<- The responsible peer for " + key + " is " + responsiblePeer + ".");
            res.status(200).json({ result: responsiblePeer });
        }).catch(() => { res.sendStatus(400); });
    }

    private findSuccessor(key: number)
    {
        var deferred = Q.defer<IResponse>();

        if (isNaN(key))
        {
            deferred.reject((void 0));
            return deferred.promise;
        }

        key %= Math.pow(2, Constants.SpaceSize);

        if (this.predecessor != null && Helpers.inRangeInclusive(key, this.predecessor.id, this.self.id))
            this.resolveToAddress(deferred, this.self.address);

        else if (Helpers.inRangeInclusive(key, this.self.id, this.successor.id))
            this.resolveToAddress(deferred, this.successor.address);

        else
        {
            this.closestLivingPrecedingNode(key).then((closest: Peer) =>
            {
                if (closest.id === this.self.id)
                    this.resolveToAddress(deferred, this.self.address);
                else
                    closest.lookup(key).then((r: IResponse) => { this.resolveToResponse(deferred, r); });
            });
        }

        return deferred.promise;
    }

    private closestLivingPrecedingNode(key: number)
    {
        var candidate: Peer = null;
        var promises: Array<Q.Promise<void>> = [ ];

        for (var i = Constants.SpaceSize - 1; i >= 0; i--)
        {
            if (Helpers.inRangeExclusive(this.fingers[i].id, this.self.id, key))
            {
                ((j: number) =>
                {
                    promises.push(this.fingers[j].isAlive().then(() =>
                    {
                        candidate = candidate !== null ? candidate : this.fingers[j];
                    }));
                })(i);
            }
        }

        return promises.reduce((soFar: any, p: Q.Promise<void>) => soFar.then(() => p, () => p), Q.when())
            .then(() => candidate !== null ? candidate : this.self);
    }

    private resolveToAddress(deferred: Q.Deferred<IResponse>, address: string)
    {
        deferred.resolve(
        {
            response: { result: address },
            statusCode: 200
        });
    }

    private resolveToResponse(deferred: Q.Deferred<IResponse>, response: IResponse)
    {
        if (response.statusCode === 200)
        {
            deferred.resolve(
            {
                response: { result: response.response.result },
                statusCode: 200
            });
        }
        else
            deferred.resolve({ response: { }, statusCode: response.statusCode });
    }

    public getPredecessor(req: Express.Request, res: Express.Response)
    {
        //        console.log("-> " + Helpers.sender(req) + " has asked for my predecessor.");
        //        console.log("<- My predecessor is " + ((this.predecessor !== null)
        //                                                   ? this.predecessor.address + " (hashed: " + this.predecessor.id + ")."
        //                                                   : "undefined."));

        res.status(200).json({ predecessor: (this.predecessor !== null) ? this.predecessor.address : null });
    }

    public setPredecessor(req: Express.Request, res: Express.Response)
    {
        var newPredecessorAddress = req.params.address;
        this.predecessor = new Peer(newPredecessorAddress);

        //        console.log("-> " + Helpers.sender(req) + " has set my predecessor to " + this.predecessor.address
        //            + " (hashed: " + this.predecessor.id + ").");

        res.sendStatus(204);
    }

    public getSuccessor(req: Express.Request, res: Express.Response)
    {
        //        console.log("-> " + Helpers.sender(req) + " has asked for my successor.");
        //        console.log("<- My successor is " + this.successor.address + " (hashed: " + this.successor.id + ").");

        res.status(200).json({ successor: this.successor.address });
    }

    public setSuccessor(req: Express.Request, res: Express.Response)
    {
        var successorAddress = req.params.address;
        this.successor = new Peer(successorAddress);

        //        console.log("-> " + Helpers.sender(req) + " has set my successor to " + this.successor.address
        //            + " (hashed: " + this.successor.id + ").");

        res.sendStatus(204);
    }

    public listFingers(req: Express.Request, res: Express.Response)
    {
        res.status(200).json({
            mostRecentlyFixedFinger: this.currentFingerFixed,
            mostRecentlyFixedSuccessor: this.currentSuccessorFixed,
            fingers: this.fingers,
            successors: this.successorList
        });
    }

    public notify(req: Express.Request, res: Express.Response)
    {
        var potentialPredecessorAddress = req.params.potentialPredecessor;
        var potentialPredecessorId = Helpers.hash(potentialPredecessorAddress);

        //        console.log("-> " + Helpers.sender(req) + " has notified me about " + potentialPredecessorAddress + ".");

        if (this.predecessor === null || Helpers.inRangeExclusive(potentialPredecessorId, this.predecessor.id, this.self.id))
        {
            this.predecessor = new Peer(potentialPredecessorAddress);
            console.log("My new predecessor is " + this.predecessor.address + " (hashed: " + this.predecessor.id + ").");
        }

        res.sendStatus(204);
    }

    public join(req: Express.Request, res: Express.Response)
    {
        var knownPeer = new Peer(req.params.address);

        knownPeer.isAlive().then<IResponse>(() =>
        {
            console.log("-> I am joining " + knownPeer.address + "...");
            return knownPeer.lookup(this.self.id);
        }).then((successorAddress: IResponse) =>
        {
            this.predecessor = null;
            this.successor = new Peer(successorAddress.response.result);

            this.moveResourceTimeout = Constants.MoveResourceTimeout;

            for (var i = 0; i < Constants.SpaceSize; i++)
                this.fixFinger(i);

            for (i = 0; i < Constants.SuccessorListCount; i++)
                this.fixSuccessorInList(i);

            console.log("-> I have joined the chord ring. My successor is now " + this.successor.address
                + " (hashed: " + this.successor.id + ").");

            res.sendStatus(204);
        }).catch((e: any) => { console.log("-> I failed to join " + knownPeer.address + " because: " + e.message + "."); });
    }

    public leave(req: Express.Request, res: Express.Response)
    {
        console.log("-> I am leaving the Chord ring...");

        if (this.predecessor !== null)
        {
            clearInterval(this.stabiliseInterval);
            clearInterval(this.fixFingersInterval);
            clearInterval(this.fixSuccessorListInterval);
            clearInterval(this.checkPredecessorInterval);
            clearInterval(this.snapshotInterval);

            this.predecessor.setSuccessor(this.successor.address).then(() =>
            {
                this.successor.setPredecessor(this.predecessor.address).then(() =>
                {
                    for (var j = this.resources.length - 1; j >= 0; j--)
                        this.moveResource(this.successor, this.resources[j]);

                    this.run();

                    res.sendStatus(204);
                    console.log("-> On my own now.");
                });
            });
        }
    }

    public findResource(name: string)
    {
        var sources = this.resources.filter(item => (item.name === name));
        return sources.length === 0 ? null : sources[0];
    }

    public listResources(req: Express.Request, res: Express.Response)
    {
        res.status(200).json({ resources: this.resources });
    }

    public readResourceSince(req: Express.Request, res: Express.Response)
    {
        var name = req.params.name;
        var id = Helpers.hash(name);
        var timestamp = req.params.timestamp;

        console.log("-> Reading resource " + name + " since " + timestamp);

        this.findSuccessor(id).then(r =>
        {
            var responsiblePeer = new Peer(r.response.result);

            if (responsiblePeer.id === this.self.id)
            {
                var rows: Array<IDataRow> = [ ];
                this.selectSinceStatement.bind(name, timestamp).each((err: any, row: IDataRow) => rows.push(row), () => res.status(200).json(rows));
            }
            else
            {
                responsiblePeer.readResourceSince(name, timestamp).then(result =>
                {
                    if (result.statusCode === 200)
                        res.status(200).json(result.response);
                    else
                        res.sendStatus(result.statusCode);
                });
            }
        });
    }

    public readResourceAll(req: Express.Request, res: Express.Response)
    {
        var name = req.params.name;
        var id = Helpers.hash(name);

        console.log("-> Reading resource " + name);

        this.findSuccessor(id).then(r =>
        {
            var responsiblePeer = new Peer(r.response.result);

            if (responsiblePeer.id === this.self.id)
            {
                if (this.findResource(req.params.name) !== null)
                {
                    var rows: Array<IDataRow> = [ ];

                    this.selectStatement.bind(name).each((err: any, row: IDataRow) =>
                    {
                        rows.push(row);
                    }, () =>
                    {
                        res.status(200).json(rows);
                    });
                }
                else
                    res.status(200).json(<any>[ ]);
            }
            else
            {
                responsiblePeer.readResourceAll(name).then(result =>
                {
                    if (result.statusCode === 200)
                        res.status(200).json(result.response);
                    else
                        res.sendStatus(result.statusCode);
                });
            }
        });
    }

    public registerResource(req: Express.Request, res: Express.Response)
    {
        var body = req.body;

        if (typeof body.name === "undefined" || typeof body.url === "undefined")
        {
            res.sendStatus(400);
            return;
        }

        var name = body.name;
        var id = Helpers.hash(body.name);
        var url = body.url;
        var primary = body.primary;
        var initialData = body.initialData;

        console.log("-> Registering resource " + name);

        this.resources = this.resources.filter(item => (!(item.name === name)));
        this.resources.push(<IResource>
        {
            name: name,
            id: id,
            url: url,
            primary: primary
        });

        if (initialData !== null && typeof initialData !== "undefined")
        {
            for (var i = 0; i < initialData.length; i++)
                this.insertWithTimestampStatement.run(initialData[i].Peer, name, initialData[i].Value, initialData[i].Timestamp);
        }

        for (i = 0; i < Constants.SuccessorListCount; i++)
        {
            ((j: number) =>
            {
                this.successorList[j].registerReplication(this.findResource(name));
            })(i);
        }

        res.sendStatus(204);
    }

    public removeResource(req: Express.Request, res: Express.Response)
    {
        var name = req.params.name;

        console.log("-> Removing resource " + name);

        this.resources = this.resources.filter(item => (!(item.name === name)));
        this.deleteStatement.run(name);

        res.sendStatus(204);
    }

    public listReplications(req: Express.Request, res: Express.Response)
    {
        res.status(200).json({ replications: this.replications });
    }

    public registerReplication(req: Express.Request, res: Express.Response)
    {
        var body = req.body;
        var name = body.name;
        var id = Helpers.hash(body.name);
        var url = body.url;
        var primary = body.primary;

        console.log("-> Registering replicated resource " + name);

        this.replications = this.replications.filter(item => (!(item.name === name)));
        this.replications.push(<IResource>
        {
            name: name,
            id: id,
            url: url,
            primary: primary
        });

        res.sendStatus(204);
    }

    public isAlive(req: Express.Request, res: Express.Response) { res.sendStatus(204); }

    public goLive()
    {
        var greeting: string;

        switch (Math.floor(Math.random() * 3))
        {
            case 0:
                greeting = "Hi, spamming friend! The Chord peer node is now online";
                break;

            case 1:
                greeting = "Chord peer node at your service";
                break;

            default:
                greeting = "Hello there, spammers! I am a Chord peer node";
                break;
        }

        console.log(greeting + ", running at " + this.self.address + " (hashed: " + this.self.id + ").");
        this.run();
    }

    private run()
    {
        this.insertStatement = db.prepare(this.insertSql);
        this.insertWithTimestampStatement = db.prepare(this.insertWithTimestampSql);
        this.selectStatement = db.prepare(this.selectSql);
        this.selectSinceStatement = db.prepare(this.selectSinceSql);
        this.selectLastTimestampStatement = db.prepare(this.selectLastTimestampSql);
        this.deleteStatement = db.prepare(this.deleteSql);

        this.predecessor = null;
        this.successor = new Peer(this.self.address);

        for (var i = 0; i < Constants.SpaceSize; i++)
            this.fingers[i] = new Peer(this.self.address);

        for (i = 0; i < Constants.SuccessorListCount; i++)
            this.successorList[i] = new Peer(this.self.address);

        this.stabilise();
        this.fixFingers();
        this.fixSuccessorList();

        this.stabiliseInterval = setInterval(() => this.stabilise(), Constants.StabiliseInterval * 1000);
        this.checkPredecessorInterval = setInterval(() => this.checkPredecessor(), Constants.StabiliseInterval * 1000);
        this.fixFingersInterval = setInterval(() => this.fixFingers(), Constants.StabiliseInterval * 1000);
        this.fixSuccessorListInterval = setInterval(() => this.fixSuccessorList(), Constants.StabiliseInterval * 1000);
        this.snapshotInterval = setInterval(() => this.snapshot(), Constants.SnapshotInterval * 1000);
    }

    private successorHasDied()
    {
        console.log("My successor has died! R.I.P. " + this.successor.address + " (hashed: " + this.successor.id + ").");
        this.fixSuccessor();
    }

    private stabilise()
    {
        this.successor.isAlive().then<IResponse>(() => { return this.successor.getPredecessor(); }).then((r: IResponse) =>
        {
            if (r.response.predecessor !== null)
            {
                var successorPredecessorAddress: string = r.response.predecessor;
                var successorPredecessor = new Peer(successorPredecessorAddress);

                if (Helpers.inRangeExclusive(successorPredecessor.id, this.self.id, this.successor.id))
                {
                    this.successor = successorPredecessor;
                    console.log("My new successor is " + this.successor.address + " (hashed: " + this.successor.id + ") (stabilised).");
                }
            }

            this.successor.notify(this.self.address);
        }).catch(() => { this.successorHasDied(); });

        this.checkResources();
    }

    private checkResources()
    {
        if (this.moveResourceTimeout > 0)
            this.moveResourceTimeout--;
        else
        {
            for (var i = this.resources.length - 1; i >= 0; i--)
            {
                ((j: number) =>
                {
                    this.findSuccessor(this.resources[j].id).then(r =>
                    {
                        var responsiblePeer = new Peer(r.response.result);

                        if (responsiblePeer.id !== this.self.id)
                            this.moveResource(responsiblePeer, this.resources[j]);
                    });
                })(i);
            }
        }
    }

    private moveResource(targetPeer: Peer, resource: IResource)
    {
        console.log("Moving resource " + resource.name + " to " + targetPeer.address + "...");

        var rows: Array<IDataRow> = [ ];

        this.selectStatement.bind(resource.name).each((err: any, row: IDataRow) =>
        {
            rows.push(row);
        }, () =>
        {
            resource.initialData = rows;
            targetPeer.registerResource(resource).then(() => { this.self.removeResource(resource.name); });
        });
    }

    public checkPredecessor()
    {
        if (this.predecessor !== null)
        {
            this.predecessor.isAlive().catch(() =>
            {
                console.log("My predecessor has died! R.I.P. " + this.predecessor.address + " (hashed: " + this.predecessor.id + ").");
                this.predecessor = null;
            });
        }
    }

    private fixFingers()
    {
        if (!this.isCurrentlyFixingFinger)
            this.fixFinger(this.currentFingerFixed).then(() => { this.currentFingerFixed = (this.currentFingerFixed + 1) % Constants.SpaceSize; });
    }

    private fixFinger(fingerToBeFixed: number)
    {
        //        console.log("Fixing finger " + fingerToBeFixed + ".");
        this.isCurrentlyFixingFinger = true;

        var deferred = Q.defer<void>();

        this.findSuccessor(this.self.id + Math.pow(2, fingerToBeFixed)).then((address) =>
        {
            this.fingers[fingerToBeFixed] = new Peer(address.response.result);
            this.isCurrentlyFixingFinger = false;
            deferred.resolve((void 0));
        });

        return deferred.promise;
    }

    private fixSuccessorList()
    {
        if (!this.isCurrentlyFixingSuccessor)
        {
            this.fixSuccessorInList(this.currentSuccessorFixed).then(() =>
            {
                this.currentSuccessorFixed = (this.currentSuccessorFixed + 1) % Constants.SuccessorListCount;
            });
        }
    }

    private fixSuccessorInList(successorToBeFixed: number)
    {
        this.isCurrentlyFixingSuccessor = true;

        var deferred = Q.defer<void>();

        if (successorToBeFixed === 0)
            this.setSuccessorInList(this.successor, successorToBeFixed, deferred);
        else
        {
            if (this.successorList[successorToBeFixed - 1].id === this.self.id)
                this.setSuccessorInList(this.successor, successorToBeFixed, deferred);
            else
            {
                this.successorList[successorToBeFixed - 1].isAlive().then<IResponse>(() =>
                {
                    return this.successorList[successorToBeFixed - 1].getSuccessor();
                }).then((r: IResponse) =>
                {
                    var successor = new Peer(r.response.successor);
                    this.setSuccessorInList(successor, successorToBeFixed, deferred);
                }).catch(() =>
                {
                    successorToBeFixed = 0;
                    this.isCurrentlyFixingSuccessor = false;
                    deferred.resolve((void 0));
                });
            }
        }

        return deferred.promise;
    }

    private setSuccessorInList(successor: Peer, successorToBeFixed: number, deferred: Q.Deferred<void>)
    {
        if (successor.id !== this.successorList[successorToBeFixed].id)
        {
            this.successorList[successorToBeFixed] = successor;

            for (var i = 0; i < this.resources.length; i++)
                successor.registerReplication(this.resources[i]);
        }

        this.isCurrentlyFixingSuccessor = false;
        deferred.resolve((void 0));
    }

    private fixSuccessor()
    {
        var candidate: Peer = null;
        var promises: Array<Q.Promise<void>> = [ ];

        for (var i = 1; i < Constants.SuccessorListCount; i++)
        {
            ((j: number) =>
            {
                promises.push(this.successorList[j].isAlive().then(() =>
                {
                    candidate = candidate !== null ? candidate : this.successorList[j];
                    this.successor = candidate;
                }));
            })(i);
        }

        promises.reduce((soFar: any, p: Q.Promise<void>) => soFar.then(() => p, () => p), Q.when()).then(() =>
        {
            this.successor = candidate !== null ? candidate : this.self;
            console.log("My new successor is " + this.successor.address + " (hashed: " + this.successor.id + ").");
        });
    }

    private snapshot()
    {
        for (var i = 0; i < this.resources.length; i++)
        {
            ((j: number) =>
            {
                new RequestDispatcher().get(this.resources[j].url).then(r =>
                {
                    var data = r.response;

                    for (var c = 0; c < this.resources[j].primary.length; c++)
                    {
                        if (!data.hasOwnProperty(this.resources[j].primary[c]))
                            data = { };
                        else
                            data = data[this.resources[j].primary[c]];
                    }

                    this.insertStatement.run(this.self.address, this.resources[j].name, JSON.stringify(data));
                });
            })(i);
        }

        for (i = this.replications.length - 1; i >= 0; i--)
        {
            ((j: number) =>
            {
                this.findSuccessor(this.replications[j].id).then((r: IResponse) =>
                {
                    var responsiblePeer = new Peer(r.response.result);

                    if (responsiblePeer.id === this.self.id)
                    {
                        this.resources = this.resources.filter(item => (!(item.name === this.replications[j].name)));
                        this.resources.push(<IResource>
                        {
                            name: this.replications[j].name,
                            id: this.replications[j].id,
                            url: this.replications[j].url,
                            primary: this.replications[j].primary
                        });
                        this.replications = this.replications.filter(item => (!(item.name === this.replications[j].name)));
                    }
                    else
                    {
                        var lastTimestamp: Date;
                        this.selectLastTimestampStatement.bind(this.replications[j].name).each((err: any, row: IDataRow) => lastTimestamp = row.timestamp, () =>
                        {
                            var promise: Q.Promise<IResponse>;

                            if (typeof lastTimestamp !== "undefined")
                                promise = responsiblePeer.readResourceSince(this.replications[j].name, lastTimestamp.toString());
                            else
                                promise = responsiblePeer.readResourceAll(this.replications[j].name);

                            promise.then(result =>
                            {
                                if (result.statusCode === 200)
                                {
                                    var data = result.response;

                                    for (var c = 0; c < data.length; c++)
                                        this.insertWithTimestampStatement.run(data[c].Peer, this.replications[j].name, data[c].Value, data[c].Timestamp);
                                }
                            });
                        });
                    }
                });
            })(i);
        }
    }

    public getHtml(htmlPage: string, req: Express.Request, res: Express.Response)
    {
        File.readFile("Views/" + htmlPage + ".html", "utf8", (err, htmlTemplate) =>
        {
            var html = htmlTemplate.split("{{ selfAddr }}").join(this.self.address);
            res.status(200).header("Content-Type", "text/html; charset=UTF-8").end(html);
        });
    }

    public getScript(scriptFile: string, req: Express.Request, res: Express.Response)
    {
        File.readFile("Scripts/" + scriptFile + ".js", "utf8", (err, scriptTemplate) =>
        {
            var js = scriptTemplate.split("{{ selfAddr }}").join(this.self.address);
            res.status(200).header("Content-Type", "application/javascript; charset=utf-8").end(js);
        });
    }
}

if (process.argv.length >= 3 && !isNaN(parseInt(process.argv[2])))
{
    if (process.argv.length === 3)
    {
        // Sets up the Chord peer.
        var host = "127.0.0.1";
        var port = parseInt(process.argv[2]);
    }
    else
    {
        // Sets up the Chord peer.
        host = process.argv[2];
        port = parseInt(process.argv[3]);
    }

    var address = host + ":" + port;

    // Adds REST entry points.
    var app = Express();
    var chord = new Chord(address);
    var jsonParser = BodyParser.json();

    // Enables CORS.
    var cors = (req: Express.Request, res: Express.Response, next: any) =>
    {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    };

    app.use(cors);

    app.get("/live", (req, res) => chord.isAlive(req, res));
    app.get("/lookup/:key", (req, res) => chord.lookup(req, res));
    app.post("/notify/:potentialPredecessor", (req, res) => chord.notify(req, res));
    app.get("/predecessor", (req, res) => chord.getPredecessor(req, res));
    app.put("/predecessor/:address", (req, res) => chord.setPredecessor(req, res));
    app.get("/successor", (req, res) => chord.getSuccessor(req, res));
    app.put("/successor/:address", (req, res) => chord.setSuccessor(req, res));
    app.get("/fingers", (req, res) => chord.listFingers(req, res));
    app.post("/join/:address", (req, res) => chord.join(req, res));
    app.post("/leave", (req, res) => chord.leave(req, res));
    app.get("/resources", (req, res) => chord.listResources(req, res));
    app.get("/resource/:name", (req, res) => chord.readResourceAll(req, res));
    app.get("/resource/:name/:timestamp", (req, res) => chord.readResourceSince(req, res));
    app.put("/resource", jsonParser, (req, res) => chord.registerResource(req, res));
    app.delete("/resource/:name", (req, res) => chord.removeResource(req, res));
    app.get("/replications", (req, res) => chord.listReplications(req, res));
    app.put("/replication", jsonParser, (req, res) => chord.registerReplication(req, res));

    // Adds web interface resources.
    app.get("/", (req, res) => chord.getHtml("index", req, res));
    app.get("/Scripts/interface.js", (req, res) => chord.getScript("interface", req, res));

    app.use(Express.static(__dirname + "/"));

    // Sets up SQLite database.
    var dataPath = __dirname + "/Data/" + Helpers.hash(address) + ".db";

    if (!File.existsSync(dataPath))
        File.openSync(dataPath, "w");

    var db = new SQLite.Database(dataPath);
    db.run("CREATE TABLE IF NOT EXISTS Snapshots (Peer VARCHAR(255), Name VARCHAR(255), Value REAL, Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(Name, Timestamp))", () =>
    {
        // Launches the chord service locally on the given port.
        app.listen(port, host, () => chord.goLive());
    });
}
else console.log("Usage: node chord [host = 127.0.0.1] [port]");