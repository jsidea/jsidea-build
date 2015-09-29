import bp = require('./BaseProcessor');
import dp = require('./Dependency');
import ma = require('./Manager');
import https = require('https');

export class Permalink {

    private _githubUser = "jsidea";
    private _githubRepository = "jsidea";
    private _onComplete: ((key: string) => any)[] = [];

    public loadMasterKey(file: string, onComplete: (key: string) => any): void {
        this._onComplete.push(onComplete);
        this.load(file);
    }
    public getBaseURL(key: string): string {
        var path = "/" + this._githubUser + "/" + this._githubRepository + "/" + key + "/";
        return "https://raw.githubusercontent.com" + path;
    }

    private load(localPath: string): void {
        var host = "github.com";
        var path = "/" + this._githubUser + "/" + this._githubRepository + "/blob/master/";

        var options = {
            host: host,
            port: 443,
            path: path + localPath,
            method: "GET"
        };

        var data: string[] = [];
        https.get(options, (res) => {
            res.on("data", (e: Buffer) => {
                data.push(e.toString());
            });
            res.on('end', (e) => {
                this._onComplete[0](this.fromHTML(data.join("")));
                this._onComplete.shift();
            })
        }).on('error', (e) => {
            console.log("Got error: " + e.message);
            this._onComplete[0]("");
            this._onComplete.shift();
        });
    }

    private fromHTML(html: string): string {
        var path = "/" + this._githubUser + "/" + this._githubRepository + "/blob/";
        var head = "<a href=\"" + path;
        var idx = html.indexOf(head);
        if (idx < 0)
            return html;
        var fst = idx + head.length;
        var lst = html.indexOf('/', fst);
        //        return "https://raw.githubusercontent.com" + path + html.substring(fst, lst);
        return html.substring(fst, lst);
    }
}