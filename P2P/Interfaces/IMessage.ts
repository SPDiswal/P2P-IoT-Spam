interface IMessage<TContents>
{
    id: string;
    contents: TContents;
    tags: Array<string>;
}

export = IMessage;