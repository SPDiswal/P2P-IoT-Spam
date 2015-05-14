class SpanningTreeMessages
{
    public static get Message(): string { return "Message"; } // Sends a message to a peer.
    
    public static get GetNode(): string { return "GetNode"; } // Gets the spanning tree node of a tag at a particular peer.

    public static get SetLeft(): string { return "SetLeft"; } // Sets the left child node of a spanning tree node of a tag at a particular peer.

    public static get SetRight(): string { return "SetRight"; } // Sets the right child node of a spanning tree node of a tag at a particular peer.

    public static get SetParent(): string { return "SetParent"; } // Sets the parent node of a spanning tree node of a tag at a particular peer.
}

export = SpanningTreeMessages;