import type { LoggerFunction, RequestResponseLoggingPluginOptions } from './request-response-logging'
import { describe, expect, it, vi } from 'vitest'
import { RequestResponseLoggingPlugin } from './request-response-logging'

describe('requestResponseLoggingPlugin', () => {
  describe('constructor', () => {
    it('should create plugin with default configuration', () => {
      const plugin = new RequestResponseLoggingPlugin()

      expect(plugin.order).toBe(1000000)
      expect(plugin).toBeInstanceOf(RequestResponseLoggingPlugin)
    })

    it('should merge custom options with defaults', () => {
      const options: RequestResponseLoggingPluginOptions = {
        logLevel: 'debug',
        format: 'pretty',
        maxPayloadSize: 5000,
        maskFields: ['customField'],
      }

      const plugin = new RequestResponseLoggingPlugin(options)

      expect(plugin).toBeInstanceOf(RequestResponseLoggingPlugin)
    })

    it('should handle custom logger function', () => {
      const mockLogger: LoggerFunction = vi.fn()
      const options: RequestResponseLoggingPluginOptions = {
        logger: mockLogger,
      }

      const plugin = new RequestResponseLoggingPlugin(options)

      expect(plugin).toBeInstanceOf(RequestResponseLoggingPlugin)
    })

    it('should handle custom logger adapter', () => {
      const mockAdapter = {
        log: vi.fn(),
      }
      const options: RequestResponseLoggingPluginOptions = {
        logger: mockAdapter,
      }

      const plugin = new RequestResponseLoggingPlugin(options)

      expect(plugin).toBeInstanceOf(RequestResponseLoggingPlugin)
    })
  })

  describe('environment configuration', () => {
    it('should apply development environment config', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const options: RequestResponseLoggingPluginOptions = {
        logLevel: 'info',
        environment: {
          development: {
            logLevel: 'debug',
            format: 'pretty',
          },
        },
      }

      const plugin = new RequestResponseLoggingPlugin(options)

      expect(plugin).toBeInstanceOf(RequestResponseLoggingPlugin)

      process.env.NODE_ENV = originalEnv
    })

    it('should apply production environment config', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const options: RequestResponseLoggingPluginOptions = {
        logLevel: 'debug',
        environment: {
          production: {
            logLevel: 'warn',
            format: 'json',
          },
        },
      }

      const plugin = new RequestResponseLoggingPlugin(options)

      expect(plugin).toBeInstanceOf(RequestResponseLoggingPlugin)

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('init method', () => {
    it('should have init method', () => {
      const plugin = new RequestResponseLoggingPlugin()

      expect(typeof plugin.init).toBe('function')
    })

    it('should accept StandardHandlerOptions', () => {
      const plugin = new RequestResponseLoggingPlugin()
      const mockOptions = {
        plugins: [],
      }

      // Should not throw
      expect(() => plugin.init(mockOptions as any)).not.toThrow()
    })
  })

  describe('logger creation', () => {
    it('should create console logger by default', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      const plugin = new RequestResponseLoggingPlugin({
        logLevel: 'info',
      })

      // Access private logger through type assertion for testing
      const logger = (plugin as any).logger
      logger.info('test message')

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should respect log level filtering', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

      const plugin = new RequestResponseLoggingPlugin({
        logLevel: 'info', // debug should be filtered out
      })

      const logger = (plugin as any).logger
      logger.debug('debug message')

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should format messages correctly in JSON format', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      const plugin = new RequestResponseLoggingPlugin({
        format: 'json',
        logLevel: 'info',
      })

      const logger = (plugin as any).logger
      logger.info('test message', { requestId: '123' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"test message"'),
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"123"'),
      )

      consoleSpy.mockRestore()
    })

    it('should format messages correctly in pretty format', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      const plugin = new RequestResponseLoggingPlugin({
        format: 'pretty',
        logLevel: 'info',
      })

      const logger = (plugin as any).logger
      logger.info('test message', { requestId: '123' })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('INFO: test message'),
      )

      consoleSpy.mockRestore()
    })
  })
})
