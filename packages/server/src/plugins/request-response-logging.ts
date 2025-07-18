import type { StandardHandlerOptions, StandardHandlerPlugin } from '../adapters/standard'
import type { Context } from '../context'

/**
 * Log levels supported by the plugin
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Log metadata interface for structured logging
 */
export interface LogMetadata {
  requestId?: string
  procedure?: string
  method?: string
  path?: string
  input?: any
  output?: any
  error?: any
  performance?: PerformanceMetrics
  timestamp?: string
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  requestDuration: number
  responseSize: number
  middlewareTimings?: {
    [middlewareName: string]: number
  }
}

/**
 * Logger interface for different logging implementations
 */
export interface LoggerInterface {
  debug(message: string, meta?: LogMetadata): void
  info(message: string, meta?: LogMetadata): void
  warn(message: string, meta?: LogMetadata): void
  error(message: string, meta?: LogMetadata): void
}

/**
 * Custom logger function type
 */
export type LoggerFunction = (level: LogLevel, message: string, meta?: LogMetadata) => void

/**
 * Logger adapter for external logging libraries
 */
export interface LoggerAdapter {
  log: LoggerFunction
}

/**
 * Sampling configuration for high-traffic scenarios
 */
export interface SamplingConfig {
  enabled: boolean
  percentage: number
}

/**
 * Environment-specific configuration options
 */
export interface EnvironmentConfig {
  development?: Partial<RequestResponseLoggingPluginOptions>
  production?: Partial<RequestResponseLoggingPluginOptions>
}

/**
 * Configuration options for the Request/Response Logging Plugin
 */
export interface RequestResponseLoggingPluginOptions {
  /**
   * Log level threshold
   * @default 'info'
   */
  logLevel?: LogLevel

  /**
   * Output format for logs
   * @default 'json'
   */
  format?: 'json' | 'pretty'

  /**
   * Custom logger implementation
   */
  logger?: LoggerFunction | LoggerAdapter

  /**
   * Fields to mask in request/response data
   * @default ['password', 'token', 'secret', 'authorization']
   */
  maskFields?: string[]

  /**
   * Procedures to exclude from logging
   * @default []
   */
  excludeProcedures?: string[]

  /**
   * Maximum payload size to log (in bytes)
   * @default 10000
   */
  maxPayloadSize?: number

  /**
   * Include performance metrics in logs
   * @default true
   */
  includePerformanceMetrics?: boolean

  /**
   * Request sampling configuration
   */
  sampling?: SamplingConfig

  /**
   * Environment-specific configuration overrides
   */
  environment?: EnvironmentConfig
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<RequestResponseLoggingPluginOptions, 'logger' | 'environment'>> = {
  logLevel: 'info',
  format: 'json',
  maskFields: ['password', 'token', 'secret', 'authorization'],
  excludeProcedures: [],
  maxPayloadSize: 10000,
  includePerformanceMetrics: true,
  sampling: {
    enabled: false,
    percentage: 100,
  },
}

/**
 * Request/Response Logging Plugin for oRPC
 *
 * Provides comprehensive logging capabilities for all RPC requests and responses,
 * including performance metrics, data masking, and configurable output formats.
 *
 * @see {@link https://orpc.unnoq.com/docs/plugins/request-response-logging Request/Response Logging Plugin Docs}
 */
export class RequestResponseLoggingPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  /**
   * Plugin execution order - runs early in the pipeline to capture all requests
   */
  readonly order: number = 1000000

  private readonly config: Required<Omit<RequestResponseLoggingPluginOptions, 'logger' | 'environment'>>
  private readonly logger: LoggerInterface
  private readonly customLogger?: LoggerFunction | LoggerAdapter

  constructor(options: RequestResponseLoggingPluginOptions = {}) {
    // Apply environment-specific configuration
    const environmentConfig = this.getEnvironmentConfig(options)
    const mergedOptions = { ...options, ...environmentConfig }

    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...mergedOptions,
      maskFields: [...DEFAULT_CONFIG.maskFields, ...(mergedOptions.maskFields || [])],
    }

    this.customLogger = mergedOptions.logger
    this.logger = this.createLogger()
  }

  /**
   * Initialize the plugin with the handler options
   */
  init(_options: StandardHandlerOptions<T>): void {
    // Plugin initialization will be implemented in subsequent tasks
    // This method will set up the interceptors for request/response logging
  }

  /**
   * Get environment-specific configuration
   */
  private getEnvironmentConfig(options: RequestResponseLoggingPluginOptions): Partial<RequestResponseLoggingPluginOptions> {
    if (!options.environment) {
      return {}
    }

    // Use globalThis to access process in a cross-platform way
    // eslint-disable-next-line node/prefer-global/process
    const env = (globalThis as any).process?.env?.NODE_ENV || 'development'

    if (env === 'production' && options.environment.production) {
      return options.environment.production
    }

    if (env === 'development' && options.environment.development) {
      return options.environment.development
    }

    return {}
  }

  /**
   * Create logger instance based on configuration
   */
  private createLogger(): LoggerInterface {
    if (this.customLogger) {
      if (typeof this.customLogger === 'function') {
        return this.createLoggerFromFunction(this.customLogger)
      }
      else {
        return this.createLoggerFromAdapter(this.customLogger)
      }
    }

    // Default console logger
    return this.createConsoleLogger()
  }

  /**
   * Create logger from custom function
   */
  private createLoggerFromFunction(loggerFn: LoggerFunction): LoggerInterface {
    return {
      debug: (message: string, meta?: LogMetadata) => loggerFn('debug', message, meta),
      info: (message: string, meta?: LogMetadata) => loggerFn('info', message, meta),
      warn: (message: string, meta?: LogMetadata) => loggerFn('warn', message, meta),
      error: (message: string, meta?: LogMetadata) => loggerFn('error', message, meta),
    }
  }

  /**
   * Create logger from adapter
   */
  private createLoggerFromAdapter(adapter: LoggerAdapter): LoggerInterface {
    return {
      debug: (message: string, meta?: LogMetadata) => adapter.log('debug', message, meta),
      info: (message: string, meta?: LogMetadata) => adapter.log('info', message, meta),
      warn: (message: string, meta?: LogMetadata) => adapter.log('warn', message, meta),
      error: (message: string, meta?: LogMetadata) => adapter.log('error', message, meta),
    }
  }

  /**
   * Safe JSON stringify that handles undefined values
   */
  private safeStringify(value: any, replacer?: any, space?: string | number): string {
    try {
      // eslint-disable-next-line ban/ban
      const result = JSON.stringify(value, replacer, space)
      return result ?? 'undefined'
    }
    catch {
      return '[Circular or non-serializable object]'
    }
  }

  /**
   * Create default console logger
   */
  private createConsoleLogger(): LoggerInterface {
    const shouldLog = (level: LogLevel): boolean => {
      const levels: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
      }
      return levels[level] >= levels[this.config.logLevel]
    }

    const formatMessage = (level: LogLevel, message: string, meta?: LogMetadata): string => {
      if (this.config.format === 'pretty') {
        const timestamp = new Date().toISOString()
        const metaStr = meta ? ` ${this.safeStringify(meta, null, 2)}` : ''
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`
      }
      else {
        return this.safeStringify({
          timestamp: new Date().toISOString(),
          level,
          message,
          ...meta,
        })
      }
    }

    return {
      debug: (message: string, meta?: LogMetadata) => {
        if (shouldLog('debug')) {
          // eslint-disable-next-line no-console
          console.debug(formatMessage('debug', message, meta))
        }
      },
      info: (message: string, meta?: LogMetadata) => {
        if (shouldLog('info')) {
          // eslint-disable-next-line no-console
          console.info(formatMessage('info', message, meta))
        }
      },
      warn: (message: string, meta?: LogMetadata) => {
        if (shouldLog('warn')) {
          console.warn(formatMessage('warn', message, meta))
        }
      },
      error: (message: string, meta?: LogMetadata) => {
        if (shouldLog('error')) {
          console.error(formatMessage('error', message, meta))
        }
      },
    }
  }
}
