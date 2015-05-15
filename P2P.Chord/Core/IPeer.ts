import Q = require("q");
import Promise = Q.Promise;

import Message = require("../../P2P/Common/Message");
import Responsibility = require("../../P2P/Common/Responsibility");

interface IPeer
{
    address: string;
    id: number;

    ping(): Promise<void>;

    getPredecessor(): Promise<string>;

    setPredecessor(newPredecessor: string): Promise<void>;

    getSuccessor(index: number): Promise<string>;

    setSuccessor(index: number, newSuccessor: string): Promise<void>;

    getFinger(index: number): Promise<string>;

    setFinger(index: number, newFinger: string): Promise<void>;

    lookup(key: number): Promise<string>;

    notify(potentialPredecessor: string): Promise<void>;

    getResponsibility(identifier: string): Promise<Responsibility>;

    getResponsibilities(): Promise<Array<Responsibility>>;

    postResponsibility(responsibility: Responsibility): Promise<void>;

    putResponsibility(responsibility: Responsibility): Promise<void>;

    deleteResponsibility(identifier: string): Promise<void>;

    getReplication(identifier: string): Promise<Responsibility>;

    getReplications(): Promise<Array<Responsibility>>;

    postReplication(responsibility: Responsibility): Promise<void>;

    putReplication(responsibility: Responsibility): Promise<void>;

    deleteReplication(identifier: string): Promise<void>;

    getAllData(): Promise<Array<Message>>;

    getData(tag: string): Promise<Array<Message>>;

    getDataSince(tag: string, timestamp: Date): Promise<Array<Message>>;

    postData(incomingData: Message): Promise<void>;

    putData(incomingData: Message): Promise<void>;

    deleteData(timestamp: Date): Promise<void>;
}

export = IPeer