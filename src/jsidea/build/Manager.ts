import fs = require("fs");
import ts = require("typescript");
import bp = require('./BaseProcessor');
import dp = require('./Dependency');
import glob = require("glob");

export interface IReport {
    fullName: string;
    file: string;
    kind: number;
    imports: string[];
}

export class Manager {
    private _dependency: dp.Dependency = null;
    private _sourcePath: string;
    private _symbols: IReport[];

    public run(sourcePath: string): void {
        this._sourcePath = sourcePath;
        var sourceFiles: string[] = glob.sync(this._sourcePath + '**/**/**.ts');
        this._dependency = new dp.Dependency();
        this._dependency.run(sourceFiles);

        //get all exports
        var exportsAll: string[] = [];
        for (var file in this._dependency.exports) {
            for (var className of this._dependency.exports[file]) {
                if (exportsAll.indexOf(className.fullName) < 0)
                    exportsAll.push(className.fullName);
            }
        }

        var imports = {};
        for (var file in this._dependency.imports) {
            var res: any = [];
            for (var r of this._dependency.imports[file])
                res.push(r.fullName);
            imports[file] = res;
        }

        var symbols: IReport[] = [];
        for (var file in this._dependency.exports) {
            for (var r of this._dependency.exports[file]) {
                symbols.push({
                    fullName: r.fullName,
                    file: this.relativeToSource(r.file),
                    kind: r.node.kind,
                    imports: imports[file],
                });
            }
        }

        this._symbols = symbols;
    }

    public getFiles(baseURL: string): dp.IFile[] {
        var files: dp.IFile[] = [];
        for (var file of this._dependency.files) {
            var name = this.relativeToSource(file.name);
            files.push({
                name: name,
                size: file.size,
//                url: baseURL + name
                //                extension: name.substr(name.lastIndexOf(".") + 1)
                //                code: fs.readFileSync(file.name).toString()
            });
        }
        return files;
    }

    public getSymbols(): IReport[] {
        return this._symbols;
    }

    public getSource(): string[] {
        var symbols = this.getSymbols();

        function getReport(fullName: string): IReport {
            for (var symbol of symbols)
                if (symbol.fullName == fullName)
                    return symbol;
            return null;
        }

        function addAt(ary: any[], data: any, index: number): any[] {
            var head = ary.slice(0, index);
            var tail = ary.slice(index);
            ary.splice(0, ary.length);
            for (var da of head)
                ary.push(da);
            ary.push(data);
            for (var da of tail)
                ary.push(da);
            return ary;
        }

        //create sorted list
        var imps: IReport[] = [];
        for (var symbol of symbols) {
            var l = imps.length;
            var fullName = symbol.fullName;
            var added = false;
            for (var i = 0; i < l; ++i) {
                var impSym = imps[i];
                var usedBy = this.getUsage(symbols, impSym.fullName)
                if (usedBy.indexOf(fullName) >= 0) {
                    addAt(imps, symbol, i);
                    added = true;
                    break;
                }
            }
            if (!added)
                imps.push(symbol);
        }

        //replace *.ts with *.js and unify
        var imports: string[] = [];
        for (var symbol of imps) {
            var name = symbol.file.replace(".ts", ".js");
            if (imports.indexOf(name) < 0)
                imports.push(name);
        }

        return imports.reverse();
    }

    private getReport(symbols: IReport[], fullName: string): IReport {
        for (var symbol of symbols)
            if (symbol.fullName == fullName)
                return symbol;
        return null;
    }

    private addRessource(symbol: IReport, symbols: IReport[], target: IReport[]): void {
        if (!symbol)
            return;

        for (var fullName of symbol.imports) {
            if (fullName == symbol.fullName)
                continue;
            var rep = this.getReport(symbols, fullName);
            if (rep && target.indexOf(rep) < 0)
                this.addRessource(rep, symbols, target);
        }

        if (target.indexOf(symbol) < 0)
            target.push(symbol);
    }

    //used directly and indirectly
    private getUsage(symbols: IReport[], fullName: string, target?: string[]): string[] {
        target = target || [];
        for (var sym of symbols) {
            if (sym.fullName != fullName)
                if (sym.imports.indexOf(fullName) >= 0)
                    if (target.indexOf(sym.fullName) < 0) {
                        target.push(sym.fullName);
                        this.getUsage(symbols, sym.fullName, target);
                    }
        }
        return target;
    }

    private relativeToSource(file: string): string {
//        return file.replace(this._sourcePath, "");
        return file.replace("../jsidea/", "");
    }
}