interface ISample<TContents>
{
    id: Guid;
    contents: TContents;
    tags: Array<string>;
}