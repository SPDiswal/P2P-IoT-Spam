interface IBroker
{
    send(message: MessageType, data: any): void;
    receive(callback: (type: MessageType, data: any) => void): void;
}