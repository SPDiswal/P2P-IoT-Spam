import Q = require("q");
import IResponse = require("./IResponse");

interface IRequestDispatcher
{
    "delete"(url: string, data?: string): Q.Promise<IResponse>;

    "get"(url: string, data?: string): Q.Promise<IResponse>;

    post(url: string, data?: string): Q.Promise<IResponse>;

    put(url: string, data?: string): Q.Promise<IResponse>;
}

export = IRequestDispatcher;