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
        this._manager.run(this._sourcePath);
    }

    public exportBuild(): void {
        var build: any = {};
        build.symbols = this._manager.getSymbols();
        build.files = this._manager.getFiles();
        fs.writeFileSync(
            "release/" + this._project + "/0.0.1/" + this._project + ".build.json",
            JSON.stringify(build, null, 2));
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
        source.src = this._manager.getSource();

        fs.writeFileSync(sourceFile,
            JSON.stringify(source, null, 2));
    }
}

var task = new Build("jsidea");
task.exportBuild();
task.exportSource();

//var jsFiles = glob.sync(pathPrefix + project + '/**/**.js');
//var minJS = UglifyJS.minify(jsFiles);
//console.log(title + "minfied JavaScript");
//
//var cssFiles = glob.sync(pathProject + "css/**.css");
//var minCSS = UglifyCSS.processFiles(cssFiles);
//console.log(title + "minfied CSS");