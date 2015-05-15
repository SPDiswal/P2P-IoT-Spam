import Q = require("q");
import Promise = Q.Promise;

import IResponse = require("./IResponse");

interface IRequestDispatcher
{
    "delete"(url: string, data?: string): Promise<IResponse>;

    "get"(url: string, data?: string): Promise<IResponse>;

    post(url: string, data?: string): Promise<IResponse>;

    put(url: string, data?: string): Promise<IResponse>;
}

export = IRequestDispatcher;