import fs = require("fs");
import ts = require("typescript");
import bp = require('./BaseProcessor');
import dp = require('./Dependency');

export interface IReport {
    qualifiedName: string;
    file: string;
    kind: number;
    imports: string[];
    usedBy: string[];
}

export class Manager {
    private _dependency: dp.Dependency = null;
    private _pathPrefix: string;
    private _symbols: IReport[];

    public run(sourceFiles: string[], pathPrefix: string): void {
        this._pathPrefix = pathPrefix;
        this._dependency = new dp.Dependency();
        this._dependency.run(sourceFiles);

        //get all exports
        var exportsAll: string[] = [];
        for (var file in this._dependency.exports) {
            for (var className of this._dependency.exports[file]) {
                if (exportsAll.indexOf(className.qualifiedName) < 0)
                    exportsAll.push(className.qualifiedName);
            }
        }
        
        var imports = {};
        for (var file in this._dependency.imports) {
            var res: any = [];
            for (var r of this._dependency.imports[file])
                res.push(r.qualifiedName);
            imports[file] = res;
        }

        var symbols: IReport[] = [];
        for (var file in this._dependency.exports) {
            for (var r of this._dependency.exports[file]) {
                symbols.push({
                    qualifiedName: r.qualifiedName,
                    file: this.finalizeFilePath(r.file),
                    kind: r.node.kind,
                    imports: imports[file],
                    usedBy: []
                });
            }
        }

        for (var symbol of symbols) {
            symbol.usedBy = this.getUsage(symbols, symbol.qualifiedName);
        }
        this._symbols = symbols;
    }

    public getTypeScriptRessources(): string[] {
        var symbols = this.getSymbols();

        function getReport(fullName: string): IReport {
            for (var symbol of symbols)
                if (symbol.qualifiedName == fullName)
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

        //create
        var imps: IReport[] = [];
        for (var symbol of symbols) {
            var l = imps.length;
            var fullName = symbol.qualifiedName;
            var added = false;
            for (var i = 0; i < l; ++i) {
                var impSym = imps[i];
                if (impSym.usedBy.indexOf(fullName) >= 0) {
                    addAt(imps, symbol, i);
                    added = true;
                    break;
                }
            }
            if (!added)
                imps.push(symbol);
        }

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
            if (symbol.qualifiedName == fullName)
                return symbol;
        return null;
    }

    private addRessource(symbol: IReport, symbols: IReport[], target: IReport[]): void {
        if (!symbol)
            return;

        for (var fullName of symbol.imports) {
            if (fullName == symbol.qualifiedName)
                continue;
            var rep = this.getReport(symbols, fullName);
            if (rep && target.indexOf(rep) < 0)
                this.addRessource(rep, symbols, target);
        }

        if (target.indexOf(symbol) < 0)
            target.push(symbol);
    }

    public getFiles(): dp.IFile[] {
        var files: dp.IFile[] = [];
        for (var file of this._dependency.files)
            files.push({ name: this.finalizeFilePath(file.name), size: file.size });
        return files;
    }

    public getSymbols(): IReport[] {
        return this._symbols;
    }

    //used directly and indirectly
    private getUsage(symbols: IReport[], fullName: string, target?: string[]): string[] {
        target = target || [];
        for (var sym of symbols) {
            if (sym.qualifiedName != fullName)
                if (sym.imports.indexOf(fullName) >= 0)
                    if (target.indexOf(sym.qualifiedName) < 0) {
                        target.push(sym.qualifiedName);
                        this.getUsage(symbols, sym.qualifiedName, target);
                    }
        }
        return target;
    }

    private finalizeFilePath(file: string): string {
        return file.replace(this._pathPrefix, "");
    }
}