interface IChordPeer
{
    // Joining the Chord network.
    join(): any;

    // Ordinary Chord lookup to find responsible peer.
    lookup(): any;

    // Arbitrary message tailored for the concrete routing strategy. E.g. "Subscribers", "Message"/"Sample", "Forward" etc.
    // To be forwarded to broker, which forwards it to the routing strategy.
    // Can have an argument (data), may return a value from broker (delivered by strategy).
    // /REST/endpoint -> Peer -> Broker -> Strategy (do stuff) -> Broker -> Peer -> Status: 200, JSON
    message(): any;

    // Returns all data associated to a tag (from SQLite3 database).
    getAll(): any;

    // Store a single piece of data (i.e. a message/sample) - automatically replicated by Chord.
    store(): any;
}

export = IChordPeer;