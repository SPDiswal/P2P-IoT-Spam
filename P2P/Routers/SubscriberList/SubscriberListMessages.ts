class SubscriberListMessages
{
    public static get GetSubscriberList(): string { return "GetSubscriberList"; } // Gets the filtered subscriber list of a peer.

    public static get Message(): string { return "Message"; } // Publishes a message to a peer.

    public static get MultipleMessages(): string { return "MultipleMessages"; } // Publishes multiple messages to a peer.

    public static get AddSubscription(): string { return "AddSubscription"; } // Adds a subscription to the subscriber list of a peer.

    public static get RemoveSubscription(): string { return "RemoveSubscription"; } // Removes a subscription from the subscriber list of a peer.

    public static get PublishAgainExclusively(): string { return "PublishAgainExclusively"; } // Requests an exclusive (unicast) re-publish of all previous messages.
}

export = SubscriberListMessages;