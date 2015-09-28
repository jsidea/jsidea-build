import ts = require("typescript");
import fs = require("fs");
import bp = require('./BaseProcessor');

export interface IFile {
    name: string;
    size: number;
}

export interface IReference {
    qualifiedName: string;
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

    protected processFile(file: ts.SourceFile): void {
        var stats = fs.statSync(file.fileName.replace(".ts", ".js"));
        var size = stats["size"];
        this.files.push({ name: file.fileName, size: size });
    }

    protected processNode(node: ts.Node): void {
        this.processExport(node);
    }
    
    protected finalize():void{
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
        if (this.isExported(fullName)) {
            //            console.log("ADD IMPORT", fullName);
            this.addToResult(this.imports, fullName, node);
        }
    }

    private isExported(qualifiedName: string): boolean {
        return this.exportNames.indexOf(qualifiedName) >= 0;

        for (var file in this.exports) {
            var refs = this.exports[file];
            for (var ref of refs)
                if (ref.qualifiedName == qualifiedName)
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
            var fullName = this.getQualifiedName(node);
            this.addToResult(this.exports, fullName, node);
            if (this.exportNames.indexOf(fullName) < 0)
                this.exportNames.push(fullName);
        }
    }

    protected addToResult(target: any, qualifiedName: string, node: ts.Node): void {
        if (!qualifiedName)
            return;
        var fileName: string = String(this._file.fileName);
        if (!target.hasOwnProperty(fileName)) {
            target[fileName] = [];
        }
        if (this.getIndexOfQualifiedName(qualifiedName, target[fileName]) === -1) {
            target[fileName].push({ qualifiedName: qualifiedName, node: node, file: this._file.fileName });
        }
    }

    private getIndexOfQualifiedName(qualifiedName: string, refs: IReference[]): number {
        var l = refs.length;
        for (var i = 0; i < l; ++i)
            if (refs[i].qualifiedName == qualifiedName)
                return i;
        return -1;
    }
}