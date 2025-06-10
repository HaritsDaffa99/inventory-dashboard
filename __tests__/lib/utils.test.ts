import { cn } from '@/lib/utils'

describe('Utils Functions', () => {
  describe('cn function', () => {
    it('combines multiple class names correctly', () => {
      const result = cn('text-red-500', 'bg-blue-500', 'p-4')
      expect(result).toBe('text-red-500 bg-blue-500 p-4')
    })

    it('handles undefined and null values', () => {
      const result = cn('text-red-500', undefined, 'bg-blue-500', null, 'p-4')
      expect(result).toBe('text-red-500 bg-blue-500 p-4')
    })

    it('handles empty strings', () => {
      const result = cn('text-red-500', '', 'bg-blue-500')
      expect(result).toBe('text-red-500 bg-blue-500')
    })

    it('handles conditional classes', () => {
      const isActive = true
      const isDisabled = false
      
      const result = cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      )
      
      expect(result).toBe('base-class active-class')
    })

    it('handles single class name', () => {
      const result = cn('single-class')
      expect(result).toBe('single-class')
    })

    it('handles no arguments', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('handles array of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('handles medicine card styling scenario', () => {
      const isLowStock = true
      const isSelected = false
      
      const result = cn(
        'p-4 rounded-lg border',
        'shadow-sm',
        isLowStock && 'border-red-500 bg-red-50',
        isSelected && 'ring-2 ring-blue-500'
      )
      
      expect(result).toContain('p-4 rounded-lg border')
      expect(result).toContain('shadow-sm')
      expect(result).toContain('border-red-500 bg-red-50')
      expect(result).not.toContain('ring-2 ring-blue-500')
    })

    it('handles button variant styling', () => {
      const variant = 'destructive'
      const size = 'sm'
      
      const result = cn(
        'inline-flex items-center justify-center',
        variant === 'destructive' && 'bg-red-500 text-white',
        variant === 'outline' && 'border border-gray-300',
        size === 'sm' && 'px-2 py-1 text-sm',
        size === 'lg' && 'px-6 py-3 text-lg'
      )
      
      expect(result).toContain('inline-flex items-center justify-center')
      expect(result).toContain('bg-red-500 text-white')
      expect(result).toContain('px-2 py-1 text-sm')
      expect(result).not.toContain('border border-gray-300')
      expect(result).not.toContain('px-6 py-3 text-lg')
    })

    it('handles table row styling based on medicine status', () => {
      const stockLevel = 25 // Low stock
      const isOutOfStock = stockLevel === 0
      const isLowStock = stockLevel > 0 && stockLevel < 50
      const isInStock = stockLevel >= 50
      
      const result = cn(
        'table-row border-b',
        isOutOfStock && 'bg-red-100 text-red-900',
        isLowStock && 'bg-yellow-100 text-yellow-900',
        isInStock && 'bg-green-100 text-green-900'
      )
      
      expect(result).toContain('table-row border-b')
      expect(result).toContain('bg-yellow-100 text-yellow-900')
      expect(result).not.toContain('bg-red-100 text-red-900')
      expect(result).not.toContain('bg-green-100 text-green-900')
    })

    it('handles dashboard card status indicators', () => {
      const medicineCount = 150
      const status = medicineCount > 100 ? 'high' : medicineCount > 50 ? 'medium' : 'low'
      
      const result = cn(
        'flex items-center gap-2',
        status === 'high' && 'text-green-600',
        status === 'medium' && 'text-yellow-600', 
        status === 'low' && 'text-red-600'
      )
      
      expect(result).toContain('flex items-center gap-2')
      expect(result).toContain('text-green-600')
      expect(result).not.toContain('text-yellow-600')
      expect(result).not.toContain('text-red-600')
    })
  })
})