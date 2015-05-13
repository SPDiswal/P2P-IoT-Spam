class RouterMessages
{
    public static get Join(): string { return "Join"; } // Joins the structured peer-to-peer-network.

    public static get Lookup(): string { return "Lookup"; } // Looks up the responsible peer of a key.

    public static get Replicate(): string { return "Replicate"; } // Asks the structured peer-to-peer-network to replicate a piece of information.
}

export = RouterMessages;