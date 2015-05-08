import Helpers = require("../Utilities/Helpers");
import RequestDispatcher = require("../Utilities/RequestDispatcher");

class Peer
{
    private request = new RequestDispatcher();
    public address: string;
    public id: number;

    constructor(address: string)
    {
        this.address = address;
        this.id = Helpers.hash(address);
    }

    public lookup(key: number)
    {
        console.log("Looking up " + key + " at " + this.address + " ->");
        return this.request.get(this.address + "/lookup/" + key);
    }

    public getPredecessor()
    {
        //        console.log("Getting predecessor of " + this.address + " ->");
        return this.request.get(this.address + "/predecessor");
    }

    public setPredecessor(newPredecessorAddress: string)
    {
//        console.log("Setting predecessor of " + this.address + " to " + newPredecessorAddress + " ->");
        return this.request.put(this.address + "/predecessor/" + newPredecessorAddress);
    }

    public getSuccessor()
    {
//        console.log("Getting successor of " + this.address + " ->");
        return this.request.get(this.address + "/successor");
    }

    public setSuccessor(newSuccessorAddress: string)
    {
//        console.log("Setting successor of " + this.address + " to " + newSuccessorAddress + " ->");
        return this.request.put(this.address + "/successor/" + newSuccessorAddress);
    }

    public notify(potentialPredecessorAddress: string)
    {
        //        console.log("Notifying " + this.address + " about " + potentialPredecessorAddress + " ->");
        return this.request.post(this.address + "/notify/" + potentialPredecessorAddress);
    }

    public isAlive()
    {
//        console.log("Ensuring that " + this.address + " is still alive ->");
        return this.request.get(this.address + "/live");
    }

    public readResourceSince(name: string, timestamp: string)
    {
        console.log("Reading resource " + name + " since " + timestamp + " at " + this.address + " ->");
        return this.request.get(this.address + "/resource/" + name + "/" + timestamp);
    }

    public readResourceAll(name: string)
    {
        console.log("Reading resource " + name + " at " + this.address + " ->");
        return this.request.get(this.address + "/resource/" + name);
    }

    public registerResource(resource: IResource)
    {
        console.log("Registering resource " + resource.name + " at " + this.address + " ->");
        return this.request.put(this.address + "/resource", JSON.stringify(resource));
    }

    public registerReplication(replication: IResource)
    {
        console.log("Registering replication " + replication.name + " at " + this.address + " ->");
        return this.request.put(this.address + "/replication", JSON.stringify(replication));
    }

    public removeResource(name: string)
    {
        console.log("Removing resource " + name + " at " + this.address + " ->");
        return this.request.delete(this.address + "/resource/" + name);
    }
}

export = Peer;