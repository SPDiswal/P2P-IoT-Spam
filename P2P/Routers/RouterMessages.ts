class RouterMessages
{
    public static get Join(): string { return "Join"; } // Joins the structured peer-to-peer-network.

    public static get Lookup(): string { return "Lookup"; } // Looks up the responsible peer of a key.

    public static get GetResponsibility(): string { return "GetResponsibility"; } // Gets a responsibility at this peer.
    
    public static get GetAllResponsibilities(): string { return "GetAllResponsibilities"; } // Gets all responsibilities at this peer.

    public static get PutResponsibility(): string { return "PutResponsibility"; } // Adds or updates a responsibility to the structured peer-to-peer-network (automatically replicated).

    public static get DeleteResponsibility(): string { return "DeleteResponsibility"; } // Removes a responsibility from the structured peer-to-peer-network (replicates are automatically destroyed).
}

export = RouterMessages;