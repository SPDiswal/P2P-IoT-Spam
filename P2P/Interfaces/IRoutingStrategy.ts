interface IRoutingStrategy
{
    publish<TContents>(sample: ISample<TContents>): void;
    subscribe<TContents>(subscription: ISubscription<TContents>): Guid;
    unsubscribe(id: Guid): void;
    join(domain: IAddress): void;

    // TODO: Virtual nodes/peers with e.g. lookup methods (that delegate to the broker via its .send() method).
}