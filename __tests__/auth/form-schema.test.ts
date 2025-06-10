import { RegisterSchema } from '@/lib/form_schema'
import { ZodError } from 'zod'

describe('Form Schema Validation', () => {
  describe('RegisterSchema', () => {
    it('validates valid registration data correctly', () => {
      const validData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123'
      }

      const result = RegisterSchema.safeParse(validData)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validData)
      }
    })

    it('rejects invalid email format', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123'
      }

      const result = RegisterSchema.safeParse(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid email')
      }
    })

    it('rejects password shorter than 8 characters', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: '123456'  // Only 6 characters
      }

      const result = RegisterSchema.safeParse(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 8 characters')
      }
    })

    it('rejects empty name field', () => {
      const invalidData = {
        name: '',
        email: 'john.doe@example.com',
        password: 'password123'
      }

      const result = RegisterSchema.safeParse(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 1 character')
      }
    })

    it('rejects missing required fields', () => {
      const invalidData = {
        name: 'John Doe'
        // Missing email and password
      }

      const result = RegisterSchema.safeParse(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0)
      }
    })

    it('handles multiple validation errors', () => {
      const invalidData = {
        name: '',  // Too short
        email: 'invalid-email',  // Invalid format
        password: '123'  // Too short
      }

      const result = RegisterSchema.safeParse(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors.length).toBe(3) // Should have 3 errors
      }
    })

    it('accepts valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'admin@medicine-dashboard.org',
        'doctor123@hospital.gov'
      ]

      validEmails.forEach(email => {
        const data = {
          name: 'Test User',
          email: email,
          password: 'password123'
        }

        const result = RegisterSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('accepts valid passwords', () => {
      const validPasswords = [
        'password123',
        'securePass1',
        'myPassword2024',
        'verylongpassword123'
      ]

      validPasswords.forEach(password => {
        const data = {
          name: 'Test User',
          email: 'test@example.com',
          password: password
        }

        const result = RegisterSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('accepts valid names', () => {
      const validNames = [
        'John',
        'Jane Doe',
        'Dr. Smith',
        'Maria Garcia-Lopez',
        'Admin User'
      ]

      validNames.forEach(name => {
        const data = {
          name: name,
          email: 'test@example.com',
          password: 'password123'
        }

        const result = RegisterSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('handles edge cases for password length', () => {
      // Test exactly 8 characters (minimum)
      const exactMinPassword = {
        name: 'Test User',
        email: 'test@example.com',
        password: '12345678'  // Exactly 8 characters
      }

      const result = RegisterSchema.safeParse(exactMinPassword)
      expect(result.success).toBe(true)

      // Test 7 characters (should fail)
      const tooShortPassword = {
        name: 'Test User',
        email: 'test@example.com',
        password: '1234567'  // Only 7 characters
      }

      const failResult = RegisterSchema.safeParse(tooShortPassword)
      expect(failResult.success).toBe(false)
    })
  })
})