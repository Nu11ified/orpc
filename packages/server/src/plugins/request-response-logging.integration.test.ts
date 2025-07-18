import { describe, expect, it } from 'vitest'
import { RequestResponseLoggingPlugin } from './request-response-logging'

describe('requestResponseLoggingPlugin Integration', () => {
  it('should be importable directly', () => {
    expect(RequestResponseLoggingPlugin).toBeDefined()
    expect(typeof RequestResponseLoggingPlugin).toBe('function')
  })

  it('should implement StandardHandlerPlugin interface', () => {
    const plugin = new RequestResponseLoggingPlugin()

    // Check that it has the required properties/methods
    expect(typeof plugin.order).toBe('number')
    expect(typeof plugin.init).toBe('function')

    // Check that order is set correctly
    expect(plugin.order).toBe(1000000)
  })

  it('should be instantiable with various configurations', () => {
    // Default configuration
    const defaultPlugin = new RequestResponseLoggingPlugin()
    expect(defaultPlugin).toBeInstanceOf(RequestResponseLoggingPlugin)

    // Custom configuration
    const customPlugin = new RequestResponseLoggingPlugin({
      logLevel: 'debug',
      format: 'pretty',
      maxPayloadSize: 5000,
      maskFields: ['customField'],
      excludeProcedures: ['health'],
      includePerformanceMetrics: false,
      sampling: {
        enabled: true,
        percentage: 50,
      },
    })
    expect(customPlugin).toBeInstanceOf(RequestResponseLoggingPlugin)

    // Environment-specific configuration
    const envPlugin = new RequestResponseLoggingPlugin({
      environment: {
        development: {
          logLevel: 'debug',
          format: 'pretty',
        },
        production: {
          logLevel: 'warn',
          format: 'json',
        },
      },
    })
    expect(envPlugin).toBeInstanceOf(RequestResponseLoggingPlugin)
  })

  it('should have proper TypeScript types', () => {
    const plugin = new RequestResponseLoggingPlugin()

    // These should compile without TypeScript errors
    const mockOptions = {
      plugins: [plugin],
      rootInterceptors: [],
      interceptors: [],
      clientInterceptors: [],
    }

    // Should not throw when calling init
    expect(() => plugin.init(mockOptions as any)).not.toThrow()
  })
})
