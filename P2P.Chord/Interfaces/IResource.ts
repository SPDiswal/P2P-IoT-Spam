interface IResource
{
    name: string;
    id: number;
    url: string;
    primary?: Array<string>;
    initialData?: Array<IDataRow>;
}