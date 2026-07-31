declare module 'vscode' {
  export interface ExtensionContext {
    subscriptions: { push(...items: any[]): void };
    extensionUri: Uri;
    secrets: SecretStorage;
  }
  export interface SecretStorage {
    get(key: string): Promise<string | undefined>;
    store(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  }
  export interface TextDocument {
    fileName: string;
    uri: Uri;
    getText(): string;
  }
  export interface TextEditor {
    document: TextDocument;
    viewColumn?: number;
  }
  export interface TextDocumentWillSaveEvent {
    document: TextDocument;
    waitUntil(promise: Promise<any>): void;
  }
  export interface Uri {
    toString(): string;
    fsPath: string;
    path: string;
  }
  export namespace Uri {
    export function parse(value: string): Uri;
    export function file(path: string): Uri;
  }
  export namespace window {
    export function createOutputChannel(name: string): OutputChannel;
    export function createStatusBarItem(alignment?: any, priority?: number): StatusBarItem;
    export function createWebviewPanel(viewType: string, title: string, showOptions: any, options?: any): WebviewPanel;
    export function showWarningMessage(message: string, ...items: any[]): Promise<any>;
    export function showInformationMessage(message: string, ...items: any[]): Promise<any>;
    export function showErrorMessage(message: string, ...items: any[]): Promise<any>;
    export function showQuickPick(items: string[] | Promise<string[]>, options?: any): Promise<string | undefined>;
    export function showInputBox(options?: any): Promise<string | undefined>;
    export const activeTextEditor: TextEditor | undefined;
    export function onDidChangeActiveTextEditor(listener: (editor: TextEditor | undefined) => any): any;
  }
  export namespace workspace {
    export function getConfiguration(section?: string): WorkspaceConfiguration;
    export const workspaceFolders: Array<{ uri: Uri }> | undefined;
    export function onWillSaveTextDocument(listener: (event: TextDocumentWillSaveEvent) => any): any;
  }
  export interface WorkspaceConfiguration {
    get<T>(section: string, defaultValue?: T): T;
  }
  export interface OutputChannel {
    appendLine(value: string): void;
    show(preserveFocus?: boolean): void;
  }
  export interface StatusBarItem {
    text: string;
    tooltip: string;
    backgroundColor: any;
    command: string;
    show(): void;
    dispose(): void;
  }
  export interface WebviewPanel {
    webview: Webview;
    reveal(column?: number): void;
    onDidDispose(listener: () => any): any;
  }
  export interface Webview {
    html: string;
    postMessage(message: any): Promise<boolean>;
    onDidReceiveMessage(listener: (e: any) => any, thisArgs?: any, disposables?: any[]): any;
  }
  export namespace commands {
    export function registerCommand(command: string, callback: (...args: any[]) => any): any;
    export function executeCommand(command: string, ...rest: any[]): Promise<any>;
  }
  export namespace env {
    export function openExternal(target: Uri): Promise<boolean>;
  }
  export class ThemeColor {
    constructor(id: string);
  }
  export enum StatusBarAlignment {
    Left = 1,
    Right = 2
  }
  export enum ViewColumn {
    Active = -1,
    Beside = -2,
    One = 1,
    Two = 2,
    Three = 3
  }
}

declare module 'fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: string): string;
}

declare module 'path' {
  export function join(...paths: string[]): string;
  export function dirname(p: string): string;
  export function basename(p: string, ext?: string): string;
  export function parse(p: string): { root: string; dir: string; base: string; ext: string; name: string };
}

declare module 'crypto' {
  export interface Hash {
    update(data: string, inputEncoding?: string): Hash;
    digest(encoding: string): string;
  }
  export function createHash(algorithm: string): Hash;
}

declare module 'nodemailer' {
  export function createTransport(options: any): any;
}

declare namespace NodeJS {
  export interface ProcessEnv {
    [key: string]: string | undefined;
  }
  export interface Process {
    env: ProcessEnv;
    argv: string[];
    exit(code?: number): void;
  }
}

declare var process: NodeJS.Process;
declare var Buffer: {
  from(data: string, encoding?: string): { toString(encoding: string): string };
};
