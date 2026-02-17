export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    [key: string]: unknown;
}

export class Logger {
    private minLevel: LogLevel;
    private component: string;

    constructor(component: string, minLevel: LogLevel = 'info') {
        this.component = component;
        this.minLevel = minLevel;
    }

    private shouldLog(level: LogLevel): boolean {
        return LEVEL_ORDER[level] >= LEVEL_ORDER[this.minLevel];
    }

    private emit(level: LogLevel, message: string, data?: Record<string, unknown>): void {
        if (!this.shouldLog(level)) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            component: this.component,
            message,
            ...data,
        };

        // Always write logs to stderr to avoid interfering with stdio MCP transport
        process.stderr.write(JSON.stringify(entry) + '\n');
    }

    debug(message: string, data?: Record<string, unknown>): void {
        this.emit('debug', message, data);
    }

    info(message: string, data?: Record<string, unknown>): void {
        this.emit('info', message, data);
    }

    warn(message: string, data?: Record<string, unknown>): void {
        this.emit('warn', message, data);
    }

    error(message: string, data?: Record<string, unknown>): void {
        this.emit('error', message, data);
    }
}
