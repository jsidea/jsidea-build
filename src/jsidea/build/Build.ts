import glob = require("glob");
import fs = require("fs");
import ts = require("typescript");
import bp = require('./BaseProcessor');
import dp = require('./Dependency');
import ma = require('./Manager');
import UglifyJS = require("uglify-js");
import UglifyCSS = require("uglifycss");

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
        this._manager.run(
            glob.sync(this._sourcePath + this._project + '/**/**.ts'),
            this._sourcePath);
    }

    public exportDependency(): void {
        var dep: any = {};
        dep.symbols = this._manager.getSymbols();
        dep.files = this._manager.getFiles();
        fs.writeFileSync(
            this._projectPath + this._project + ".dependency.json",
            JSON.stringify(dep, null, 2));
    }

    public exportSource(): void {
        var sourceFile = this._projectPath + this._project + ".source.json";
        var str = fs.readFileSync(sourceFile);

        var source = JSON.parse(str.toString());
        if (!source.css)
            source.css = [];
        if (!source.libs)
            source.libs = [];
        if (!source.php)
            source.php = [];
        source.src = this._manager.getTypeScriptRessources();

        fs.writeFileSync(sourceFile,
            JSON.stringify(source, null, 2));
    }
}

var task = new Build("jsidea");
task.exportDependency();
task.exportSource();

//var jsFiles = glob.sync(pathPrefix + project + '/**/**.js');
//var minJS = UglifyJS.minify(jsFiles);
//console.log(title + "minfied JavaScript");
//
//var cssFiles = glob.sync(pathProject + "css/**.css");
//var minCSS = UglifyCSS.processFiles(cssFiles);
//console.log(title + "minfied CSS");