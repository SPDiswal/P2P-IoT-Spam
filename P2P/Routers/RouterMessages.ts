class RouterMessages
{
    // From router to network.
    public static get Ping(): string { return "Ping"; } // Pings a peer in the structured peer-to-peer-network.

    public static get Join(): string { return "Join"; } // Joins the structured peer-to-peer-network.

    public static get Lookup(): string { return "Lookup"; } // Looks up the responsible peer of a key.

    public static get GetResponsibility(): string { return "GetResponsibility"; } // Gets a responsibility at this peer.
    
    public static get GetAllResponsibilities(): string { return "GetAllResponsibilities"; } // Gets all responsibilities at this peer.

    public static get PostResponsibility(): string { return "PostResponsibility"; } // Adds or overwrites a responsibility to the structured peer-to-peer-network (automatically replicated).

    public static get PutResponsibility(): string { return "PutResponsibility"; } // Adds or updates a responsibility to the structured peer-to-peer-network (automatically replicated).

    public static get DeleteResponsibility(): string { return "DeleteResponsibility"; } // Removes a responsibility from the structured peer-to-peer-network (replicates are automatically destroyed).

    public static get Retrieve(): string { return "Retrieve"; } // Retrieves all data associated with an identifier from the database.

    public static get RetrieveSince(): string { return "RetrieveSince"; } // Retrieves recent data (determined by a timestamp) associated with an identifier from the database.

    public static get Persist(): string { return "Persist"; } // Persists data to the database.

    public static get Sweep(): string { return "Sweep"; } // Removes data that is older than a certain point in time.

    // From network to router.
    public static get MergeResponsibilities(): string { return "MergeResponsibilities"; } // Invokes a delegate on the router from the network to merge two sets of responsibilities.

    public static get Heartbeat(): string { return "Heartbeat"; } // Invokes a delegate on the router from the network for frequent clean-up and maintenance.
}

export = RouterMessages;