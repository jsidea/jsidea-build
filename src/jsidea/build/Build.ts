import fs = require("fs");
import ts = require("typescript");
import bp = require('./BaseProcessor');
import dp = require('./Dependency');
import ma = require('./Manager');
import pl = require('./Permalink');
import UglifyJS = require("uglify-js");
import UglifyCSS = require("uglifycss");
import https = require('https');

interface ISource {
    css: string[];
    libs: string[];
    php: string[];
    src: string[];
}

class Build {
    private _project;
    private _projectPath: string;
    private _sourcePath: string;
    private _manager: ma.Manager;

    constructor(project: string) {
        this._project = project;
        this._projectPath = "../" + this._project + "/";
        this._sourcePath = this._projectPath + "src/";
        this._manager = new ma.Manager();
        this._manager.run(this._sourcePath);
    }

    public exportBuild(): void {
        var perm = new pl.Permalink();
        perm.loadMasterKey("README.md", (key: string) => {

            var build: any = {};
            build.project = {
                name: this._project,
                url: perm.getBaseURL(key)
            };
            build.typescript = this._manager.getSymbols();
            build.files = this._manager.getFiles(perm.getBaseURL(key));

            fs.writeFileSync(
                "../jsidea-website/build/" + this._project + "/0.0.1/" + this._project + ".build.json",
                JSON.stringify(build, null, 2));
        });
    }

    public getTypeScriptFiles(): void {

    }

    public getSource(): ISource {
        var sourceFile = this._projectPath + this._project + ".source.json";
        var str = fs.readFileSync(sourceFile);

        var source: ISource = JSON.parse(str.toString());
        if (!source.css)
            source.css = [];
        if (!source.libs)
            source.libs = [];
        if (!source.php)
            source.php = [];
        source.src = this._manager.getSource();
        return source;
    }

    public exportSource(): void {
        var sourceFile = this._projectPath + this._project + ".source.json";
        var source = this.getSource();
        fs.writeFileSync(
            sourceFile,
            JSON.stringify(source, null, 2));
    }
}

var task = new Build("jsidea");
task.exportBuild();
//task.exportSource();
//var perm = new pl.Permalink();
//perm.loadMasterKey("README.md", (key: string) => { console.log("KEY", key) });

//var jsFiles = glob.sync(pathPrefix + project + '/**/**.js');
//var minJS = UglifyJS.minify(jsFiles);
//console.log(title + "minfied JavaScript");
//
//var cssFiles = glob.sync(pathProject + "css/**.css");
//var minCSS = UglifyCSS.processFiles(cssFiles);
//console.log(title + "minfied CSS");