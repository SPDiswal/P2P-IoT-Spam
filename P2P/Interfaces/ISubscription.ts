import ISample = require("./ISample");

interface ISubscription<TContents>
{
    callback: (s: ISample<TContents>) => void;
    filter: (s: ISample<TContents>) => boolean;
    tags: Array<string>;
}

export = ISubscription;