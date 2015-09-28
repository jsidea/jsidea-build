import ts = require("typescript");

export abstract class BaseProcessor {
    protected _host: ts.CompilerHost;
    protected _program: ts.Program;
    protected _options: ts.CompilerOptions = { noLib: true };
    protected _file: ts.SourceFile;

    public run(sourceFiles: string[]): void {
        this.prepare(sourceFiles);
        this._host = ts.createCompilerHost(this._options)
        this._program = ts.createProgram(sourceFiles, this._options, this._host)
        this._program.getSourceFiles().forEach(file => {
            this._file = file;
            this.processFile(file);
            this.processNode(file);
        });
        this.finalize();
    }

    protected processFile(node: ts.SourceFile): void { }

    protected abstract processNode(node: ts.Node): void;

    protected getQualifiedName(node: ts.Node): string {
        var symbol: ts.Symbol = this.getSymbol(node);
        if (!symbol)
            return "";
        return this._program.getTypeChecker().getFullyQualifiedName(symbol);
    }

    private getTypeFullName(node: ts.TypeReferenceNode): string {
        var parts = <string[]>[];
        var tname = <ts.QualifiedName>node.typeName;


        while (tname) {
            if ((<ts.Identifier><any>tname).text) {
                parts.unshift((<ts.Identifier><any>tname).text);
            } else if (tname.right) {
                parts.unshift(tname.right.text);
            }

            tname = <ts.QualifiedName>tname.left;
        }
        return parts.join('.');
    }

    protected getName(node: ts.Node): string {
        var path = this.getPath(node);
        return path ? path[path.length - 1] : "";
    }

    protected getPath(node: ts.Node): string[] {
        var qname = this.getQualifiedName(node);
        if (qname)
            return qname.split(".");
        return null;
    }

    protected getSymbol(node: ts.Node): ts.Symbol {
        var symbol: ts.Symbol = this._program.getTypeChecker().getSymbolAtLocation(node);
        if (!symbol)
            symbol = (<any>node).symbol;
        return symbol;
    }

    protected prepare(sourceFiles: string[]): void {
    }

    protected finalize(): void { }
}