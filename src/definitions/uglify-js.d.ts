declare module "uglify-js" {
    module UglifyJS {
        export interface UglifyResult {
            code: string;
            map: string;
        }
        export interface MinifyOptions {
            inSourceMap?: string;
            outSourceMap?: string;
            sourceRoot?: string;
            warnings?: boolean;
            fromString?: boolean;
            mangle?: boolean;
            output?: string;
            compress?: boolean;
        }
        export interface ParseOptions {
            inSourceMap?: string;
            outSourceMap?: string;
            sourceRoot?: string;
            warnings?: boolean;
            fromString?: boolean;
            mangle?: boolean;
            output?: string;
            compress?: boolean;
        }
        export function parse(code: string, options?: ParseOptions): UglifyResult;
        export function minify(source: string | string[], options?: MinifyOptions): UglifyResult;
    }
    export = UglifyJS;
}