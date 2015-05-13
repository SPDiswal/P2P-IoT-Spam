//import Q = require("q");
//import IResponse = require("../../P2P.Chord/Interfaces/IResponse");
//import IRequestDispatcher = require("../../P2P.Chord/Interfaces/IRequestDispatcher");
//
//class FakeRequestDispatcher implements IRequestDispatcher
//{
//    private getUrl: string = "";
//    private getData: string = "";
//    private postUrl: string = "";
//    private postData: string = "";
//    private putUrl: string = "";
//    private putData: string = "";
//    private deleteUrl: string = "";
//    private deleteData: string = "";
//
//    public "delete"(url: string, data: string = ""): Q.Promise<IResponse>
//    {
//        this.deleteUrl = url;
//        this.deleteData = data;
//        return null;
//    }
//
//    public "get"(url: string, data: string = ""): Q.Promise<IResponse>
//    {
//        this.getUrl = url;
//        this.getData = data;
//        return null;
//    }
//
//    public post(url: string, data: string = ""): Q.Promise<IResponse>
//    {
//        this.postUrl = url;
//        this.postData = data;
//        return null;
//    }
//
//    public put(url: string, data: string = ""): Q.Promise<IResponse>
//    {
//        this.putUrl = url;
//        this.putData = data;
//        return null;
//    }
//
//    public hasSentGet(url: string, data: string = ""): boolean
//    {
//        return this.getUrl === url && this.getData === data;
//    }
//
//    public hasSentPost(url: string, data: string = ""): boolean
//    {
//        return this.postUrl === url && this.postData === data;
//    }
//
//    public hasSentPut(url: string, data: string = ""): boolean
//    {
//        return this.putUrl === url && this.putData === data;
//    }
//
//    public hasSentDelete(url: string, data: string = ""): boolean
//    {
//        return this.deleteUrl === url && this.deleteData === data;
//    }
//}
//
//export = FakeRequestDispatcher;