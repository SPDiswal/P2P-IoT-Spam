import Q = require("q");
import Promise = Q.Promise;

import IResponse = require("./IResponse");

import HttpMethod = require("./HttpMethod");

interface IRequestDispatcher
{
    send(method: HttpMethod, url: string, data?: string): Promise<IResponse>;

    "delete"(url: string, data?: string): Promise<IResponse>;

    "get"(url: string, data?: string): Promise<IResponse>;

    post(url: string, data?: string): Promise<IResponse>;

    put(url: string, data?: string): Promise<IResponse>;
}

export = IRequestDispatcher;