//externals
import fs = require("fs");
import glob = require("glob");
import ts = require("typescript");
import UglifyJS = require("uglify-js");
import UglifyCSS = require("uglifycss");
import https = require('https');
import TypeDoc = require("typedoc");
(<any>TypeDoc).td = TypeDoc;

//internals
import bp = require('./BaseProcessor');
import dp = require('./Dependency');
import ma = require('./Manager');
import pl = require('./Permalink');

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
            build.files = this._manager.getFiles();

            fs.writeFileSync(
                "../jsidea-website/build/" + this._project + "/0.0.1/" + this._project + ".build.json",
                JSON.stringify(build, null, 2));
        });
    }

    public getTypeScriptFiles(): void {

    }

    private getSource(): ISource {
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

    public minify(): void {
        var jsFiles = glob.sync(this._sourcePath + this._project + '/**/**.js');
        var minJS = UglifyJS.minify(jsFiles);
        console.log(this._project + "minfied JavaScript");
    }

    public exportDocs(): void {
        var opt: any = {
            theme: "",
            target: "ES5",
            mode: "file"
        };
        var app = new TypeDoc.td.Application(opt);
        var sourceFiles: string[] = glob.sync(this._sourcePath + "**/**.ts");
        app.generateDocs(sourceFiles, "bin");
        console.log("DOCS GENERATED");
    }
}

var task = new Build("jsidea");
task.exportBuild();
task.exportSource();
//task.exportDocs();


//var jsFiles = glob.sync(pathPrefix + project + '/**/**.js');
//var minJS = UglifyJS.minify(jsFiles);
//console.log(title + "minfied JavaScript");
//
//var cssFiles = glob.sync(pathProject + "css/**.css");
//var minCSS = UglifyCSS.processFiles(cssFiles);
//console.log(title + "minfied CSS");