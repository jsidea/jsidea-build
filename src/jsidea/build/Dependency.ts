import ts = require("typescript");
import fs = require("fs");
import bp = require('./BaseProcessor');
import UglifyJS = require("uglify-js");

export interface IFile {
    name: string;
    size: number;
    code: string;
    sizeMinified: number;
    //    url: string;
}

export interface IReference {
    fullName: string;
    node: ts.Node;
    file: string;
    kind: number;
}

export interface Result {
    [fileName: string]: IReference[];
}

export class Dependency extends bp.BaseProcessor {
    private _stack: ts.ModuleDeclaration[] = [];
    public exports: Result = null;
    public imports: Result = null;
    public exportNames: string[] = null;
    public files: IFile[] = null;

    protected prepare(sourceFiles: string[]): void {
        this.exports = {};
        this.imports = {};
        this.files = [];
        this.exportNames = [];
    }

    protected processFile(file: ts.SourceFile): boolean {
        if(file.fileName.indexOf(".d.ts") >= 0)
            return false;
        var stats = fs.statSync(file.fileName.replace(".ts", ".js"));
        var size = stats["size"];
        var minJS = UglifyJS.minify(file.fileName.replace(".ts", ".js"));
        this.files.push({ name: file.fileName, size: size, code: "", sizeMinified: this.byteLengthUTF8(minJS.code) });
        return true;
    }

    protected byteLengthUTF8(str: string): number {
        // returns the byte length of an utf8 string
        var s = str.length;
        for (var i = str.length - 1; i >= 0; i--) {
            var code = str.charCodeAt(i);
            if (code > 0x7f && code <= 0x7ff)
                s++;
            else if (code > 0x7ff && code <= 0xffff)
                s += 2;
            if (code >= 0xDC00 && code <= 0xDFFF)
                i--; //trail surrogate
        }
        return s;
    }

    protected processNode(node: ts.Node): void {
        this.processExport(node);
    }

    protected finalize(): void {
        this._stack.splice(0, this._stack.length);
        this._program.getSourceFiles().forEach(file => {
            this._file = file;
            this.processImports(file);
        });
    }

    private processExport(node: ts.Node): void {
        if (node.kind == ts.SyntaxKind.ModuleDeclaration)
            this._stack.push(<ts.ModuleDeclaration>node);

        switch (node.kind) {
            case ts.SyntaxKind.ModuleDeclaration:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.VariableDeclaration:
            case ts.SyntaxKind.FunctionDeclaration:
                this.extractExport(node);
        }

        var skipChildren = node.kind == ts.SyntaxKind.ClassDeclaration;
        if (!skipChildren)
            ts.forEachChild(node, node => this.processExport(node));

        if (node.kind == ts.SyntaxKind.ModuleDeclaration)
            this._stack.pop();
    }

    private processImports(node: ts.Node): void {

        if (node.kind == ts.SyntaxKind.ModuleDeclaration)
            this._stack.push(<ts.ModuleDeclaration>node);
        //        switch (node.kind) {
        //            case ts.SyntaxKind.Identifier:
        //            case ts.SyntaxKind.ExtendsKeyword:
        //            case ts.SyntaxKind.ClassKeyword:
        //            case ts.SyntaxKind.ClassExpression:
        //            case ts.SyntaxKind.ClassDeclaration:
        //            case ts.SyntaxKind.PropertyAccessExpression:
        this.extractImports(node);
        //        }

        ts.forEachChild(node, node => this.processImports(node));

        if (node.kind == ts.SyntaxKind.ModuleDeclaration)
            this._stack.pop();
    }

    private extractImports(node: ts.Node): void {
        var path = this.getPath(node);

        if (node.kind == ts.SyntaxKind.ExpressionWithTypeArguments) {
            var exp = <ts.ExpressionWithTypeArguments>node;
            var signature = exp.expression.getText();
            var stack = this._stack.map((a) => { return a.name.getText(); });
            var mod = "";
            this.addImport(signature, node);
            if (signature && stack.length > 0) {
                for (var modName of stack) {
                    mod += (mod ? "." : "") + modName;
                    if (mod) {
                        this.addImport(mod + "." + signature, node);
                    }
                }
            }
            return;
        }

        if (path) {
            var fullName: string = "";
            var l = path.length;
            for (var i = 0; i < l; ++i) {
                fullName += (fullName ? "." : "") + path[i];
                this.addImport(fullName, node);
            }
        }
    }

    private addImport(fullName: string, node: ts.Node): void {
        if (this.isExported(fullName))
            this.addToResult(this.imports, fullName, node);
    }

    private isExported(fullName: string): boolean {
        return this.exportNames.indexOf(fullName) >= 0;

        for (var file in this.exports) {
            var refs = this.exports[file];
            for (var ref of refs)
                if (ref.fullName == fullName)
                    return true;
        }
        return false;
    }

    private extractExport(node: ts.Node) {
        var isNodeExported = false;
        if (this._stack.length > 0) {
            var name = this.getName(node);
            var lastModule: any = this._stack[this._stack.length - 1];
            isNodeExported = lastModule.symbol ? lastModule.symbol.exports.hasOwnProperty(name) : false;
        }
        if (isNodeExported) {
            var fullName = this.getFullName(node);
            this.addToResult(this.exports, fullName, node);
            if (this.exportNames.indexOf(fullName) < 0)
                this.exportNames.push(fullName);
        }
    }

    protected addToResult(target: any, fullName: string, node: ts.Node): void {
        if (!fullName)
            return;
        var fileName: string = String(this._file.fileName);
        if (!target.hasOwnProperty(fileName)) {
            target[fileName] = [];
        }
        if (this.getIndexOfFullName(fullName, target[fileName]) === -1) {
            target[fileName].push(<IReference>{ fullName: fullName, node: node, file: this._file.fileName });
        }
    }

    private getIndexOfFullName(fullName: string, refs: IReference[]): number {
        var l = refs.length;
        for (var i = 0; i < l; ++i)
            if (refs[i].fullName == fullName)
                return i;
        return -1;
    }
}