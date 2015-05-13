import Q = require("q");
import Promise = Q.Promise;

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

    putResponsibility(responsibility: Responsibility): Promise<void>;

    deleteResponsibility(identifier: string): Promise<void>;
}

export = IPeer