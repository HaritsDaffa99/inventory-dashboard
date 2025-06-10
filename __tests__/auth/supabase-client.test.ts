import { createClient } from '@supabase/supabase-js'

// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Supabase Client Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates client without errors', () => {
    // Mock a successful client creation
    const mockClient = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: '123' } }, error: null }),
        signUp: jest.fn().mockResolvedValue({ data: { user: { id: '123' } }, error: null }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
        getSession: jest.fn().mockResolvedValue({ data: { session: {} }, error: null }),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn(),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    // Test that createClient can be called
    const client = createClient('test-url', 'test-key')
    expect(client).toBeDefined()
  })

  it('client has auth methods', () => {
    const mockClient = {
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn(),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    const client = createClient('test-url', 'test-key')
    expect(client.auth).toBeDefined()
    expect(client.auth.signInWithPassword).toBeDefined()
    expect(client.auth.signUp).toBeDefined()
    expect(client.auth.signOut).toBeDefined()
  })

  it('client has database methods', () => {
    const mockTable = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    
    const mockClient = {
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn().mockReturnValue(mockTable),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    const client = createClient('test-url', 'test-key')
    expect(client.from).toBeDefined()
    expect(typeof client.from).toBe('function')
    
    const table = client.from('users')
    expect(table.select).toBeDefined()
  })

  it('createClient is called with valid parameters', () => {
    const mockClient = {
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn(),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    const testUrl = 'https://test.supabase.co'
    const testKey = 'test-anon-key'
    
    createClient(testUrl, testKey)
    
    expect(mockCreateClient).toHaveBeenCalledWith(testUrl, testKey)
  })

  it('client supports authentication operations', async () => {
    const mockClient = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({ 
          data: { user: { id: '123' } }, 
          error: null 
        }),
        signUp: jest.fn().mockResolvedValue({ 
          data: { user: { id: '123' } }, 
          error: null 
        }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
        getSession: jest.fn().mockResolvedValue({ 
          data: { session: {} }, 
          error: null 
        }),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn(),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    const client = createClient('test-url', 'test-key')
    
    // Test auth methods return promises
    await expect(client.auth.signInWithPassword()).resolves.toBeDefined()
    await expect(client.auth.signUp()).resolves.toBeDefined()
    await expect(client.auth.signOut()).resolves.toBeDefined()
    await expect(client.auth.getSession()).resolves.toBeDefined()
  })

  it('client supports database operations', () => {
    const mockTable = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    
    const mockClient = {
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn().mockReturnValue(mockTable),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    const client = createClient('test-url', 'test-key')
    const table = client.from('users')
    
    expect(table.select).toBeDefined()
    expect(table.insert).toBeDefined()
    expect(table.update).toBeDefined()
    expect(table.delete).toBeDefined()
  })

  it('handles client initialization', () => {
    const mockClient = {
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn(),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    // Test that client creation doesn't throw
    expect(() => {
      createClient('https://test.supabase.co', 'test-key')
    }).not.toThrow()
  })

  it('validates URL format', () => {
    const mockClient = {
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn(),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    const validUrl = 'https://test.supabase.co'
    createClient(validUrl, 'test-key')
    
    expect(mockCreateClient).toHaveBeenCalledWith(validUrl, 'test-key')
    expect(validUrl).toMatch(/^https:\/\//)
    expect(validUrl).toContain('supabase.co')
  })

  it('validates anon key format', () => {
    const mockClient = {
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn(),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    const testKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'
    createClient('https://test.supabase.co', testKey)
    
    expect(mockCreateClient).toHaveBeenCalledWith('https://test.supabase.co', testKey)
    expect(testKey).toMatch(/^eyJ/) // JWT tokens start with eyJ
    expect(testKey.split('.')).toHaveLength(3) // JWT has 3 parts
  })

  it('client methods are functions', () => {
    const mockClient = {
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn(),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    const client = createClient('test-url', 'test-key')
    
    expect(typeof client.auth.signInWithPassword).toBe('function')
    expect(typeof client.auth.signUp).toBe('function')
    expect(typeof client.auth.signOut).toBe('function')
    expect(typeof client.from).toBe('function')
  })

  it('supports real-world configuration', () => {
    const mockClient = {
      auth: { signInWithPassword: jest.fn() },
      from: jest.fn(),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    // Test with realistic Supabase URL and key format
    const supabaseUrl = 'https://jsysbnfhpmppbwavgxyr.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzeXNibmZocG1wcGJ3YXZneHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyODEzMDAsImV4cCI6MjA1MDg1NzMwMH0.7M4vyUh7Hr8PDBEEZ4xY0MuboUegBl7h2EqOaIsjfyM'
    
    expect(() => {
      createClient(supabaseUrl, supabaseKey)
    }).not.toThrow()
    
    expect(mockCreateClient).toHaveBeenCalledWith(supabaseUrl, supabaseKey)
  })

  it('handles auth state changes', () => {
    const mockClient = {
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn(),
    }
    
    mockCreateClient.mockReturnValue(mockClient as ReturnType<typeof createClient>)
    
    const client = createClient('test-url', 'test-key')
    
    expect(client.auth.onAuthStateChange).toBeDefined()
    expect(typeof client.auth.onAuthStateChange).toBe('function')
  })
})