declare module "uglifycss" {
    module UglifyCSS {
        export interface UglifyResult {
            code: string;
            map: string;
        }
        export interface ProcessOptions {
            cuteComments?: boolean;
            uglyComments?: boolean;
            expandVars?: boolean;
            maxLineLen?: number;
        }
        export function processString(code: string, options?: ProcessOptions): UglifyResult;
        export function processFiles(source: string[], options?: ProcessOptions): UglifyResult;
    }
    export = UglifyCSS;
}