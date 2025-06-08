export interface DiseaseCategory {
  id: string
  name: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  diseases: string[]
  outbreakThreshold: number
  seasonality: 'YEAR_ROUND' | 'SEASONAL' | 'OUTBREAK_BASED'
  description: string
  color: string
}

export const DISEASE_CATEGORIES: Record<string, DiseaseCategory> = {
  VACCINE_PREVENTABLE: {
    id: 'VACCINE_PREVENTABLE',
    name: 'Vaccine-Preventable Diseases',
    priority: 'HIGH',
    diseases: ['Hepatitis B', 'Tetanus', 'Diphtheria', 'Measles & Rubella', 'Polio', 'Pertussis'],
    outbreakThreshold: 0.3, // 30% increase
    seasonality: 'YEAR_ROUND',
    description: 'Diseases that should be declining due to vaccination programs',
    color: '#3B82F6' // Blue
  },
  EMERGENCY_ZOONOTIC: {
    id: 'EMERGENCY_ZOONOTIC',
    name: 'Emergency/Zoonotic Diseases',
    priority: 'CRITICAL',
    diseases: ['Rabies', 'Snakebite'],
    outbreakThreshold: 0.1, // 10% increase (very sensitive)
    seasonality: 'OUTBREAK_BASED',
    description: 'Life-threatening diseases requiring immediate response',
    color: '#EF4444' // Red
  },
  RESPIRATORY: {
    id: 'RESPIRATORY',
    name: 'Respiratory Diseases',
    priority: 'HIGH',
    diseases: ['COVID-19', 'Pneumococcal Infection', 'Haemophilus influenzae type B'],
    outbreakThreshold: 0.5, // 50% increase
    seasonality: 'SEASONAL',
    description: 'Highly contagious respiratory infections',
    color: '#F59E0B' // Amber
  },
  CHILDHOOD_IMMUNIZATION: {
    id: 'CHILDHOOD_IMMUNIZATION',
    name: 'Routine Childhood Immunization',
    priority: 'MEDIUM',
    diseases: ['Rotavirus', 'Tuberculosis', 'Human Papillomavirus'],
    outbreakThreshold: 0.4, // 40% increase
    seasonality: 'YEAR_ROUND',
    description: 'Routine vaccination program monitoring',
    color: '#10B981' // Green
  }
}

export function categorizeDiseases(diseases: string[]): Record<string, string[]> {
  const categorized: Record<string, string[]> = {}
  
  diseases.forEach(disease => {
    let assigned = false
    
    for (const [categoryId, category] of Object.entries(DISEASE_CATEGORIES)) {
      if (category.diseases.includes(disease)) {
        if (!categorized[categoryId]) {
          categorized[categoryId] = []
        }
        categorized[categoryId].push(disease)
        assigned = true
        break
      }
    }
    
    // If not assigned to any category, put in "OTHER"
    if (!assigned) {
      if (!categorized['OTHER']) {
        categorized['OTHER'] = []
      }
      categorized['OTHER'].push(disease)
    }
  })
  
  return categorized
}