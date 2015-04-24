enum MessageType
{
    // Outgoing.
    Publish,
    Subscribe,
    Unsubscribe,
    Join,
    FilteredSubscribers,
    RetrieveAllMessages,

    // Incoming.
    Message,
    Subscribers,
    Subscription,
    Unsubscription,
}

export = MessageType;