import * as vscode from 'vscode';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class OutputLogger {
  private static instance: OutputLogger;
  private outputChannel?: vscode.OutputChannel;
  private currentLogLevel: LogLevel = 'info';

  private constructor() {
    try {
      this.outputChannel = vscode.window.createOutputChannel('SN Object Guard');
    } catch {
      // Running outside VS Code context (CLI/companion)
    }
  }

  public static getInstance(): OutputLogger {
    if (!OutputLogger.instance) {
      OutputLogger.instance = new OutputLogger();
    }
    return OutputLogger.instance;
  }

  public setLogLevel(level: LogLevel) {
    this.currentLogLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.currentLogLevel);
  }

  public log(level: LogLevel, message: string, ...args: any[]) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message} ${args.length ? JSON.stringify(args) : ''}`;

    if (this.outputChannel) {
      this.outputChannel.appendLine(formatted);
    } else {
      console.log(formatted);
    }
  }

  public debug(message: string, ...args: any[]) { this.log('debug', message, ...args); }
  public info(message: string, ...args: any[]) { this.log('info', message, ...args); }
  public warn(message: string, ...args: any[]) { this.log('warn', message, ...args); }
  public error(message: string, ...args: any[]) { this.log('error', message, ...args); }
  public show() { this.outputChannel?.show(true); }
}
