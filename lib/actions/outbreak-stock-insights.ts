"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

// Type definitions for outbreak stock analysis
interface OutbreakForecastData {
  severity: string
  timeline: string
  diseaseCategory: string
  affectedPopulation?: number
  outbreakVelocity?: number
  doublingTime?: string
  epidemicCurve?: string
}

interface StockMedicine {
  id: number
  name: string
  currentQuantity: number
  weeklyConsumption: number
  daysRemaining: number
  category: string
  unitName?: string
  expiryDate?: string
}

interface OutbreakStockData {
  outbreakForecast: OutbreakForecastData
  currentStock: {
    medicines: StockMedicine[]
    totalUnits: number
    totalValue?: number
  }
  selectedCategory: string
  unitData?: {
    unitId: number
    unitName: string
    location?: string
  }[]
}

interface StockInsightsResponse {
  summary: string
  keyFindings: string[]
  recommendations: string[]
  riskMitigation: string[]
}

// Access API key
const API_KEY = process.env.GEMINI_API_KEY

export async function getOutbreakStockInsights(data: OutbreakStockData) {
  console.log("🔍 Starting outbreak stock insights analysis...")
  
  if (!API_KEY) {
    console.error("❌ GEMINI_API_KEY is not defined")
    return {
      success: false,
      error: "AI service is not configured. Please contact administrator."
    }
  }

  try {
    console.log("📊 Analyzing outbreak data:", {
      diseaseCategory: data.selectedCategory,
      severity: data.outbreakForecast.severity,
      medicineCount: data.currentStock.medicines.length
    })

    // Create detailed prompt for stock preparedness analysis
    const prompt = createStockPreparednessPrompt(data)
    
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })
    
    console.log("🤖 Sending request to Gemini AI...")
    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    console.log("✅ Received AI response, processing...")
    
    // Clean and process the response
    const cleanedResponse = cleanResponseText(response)
    const processedInsights = processStockInsightsResponse(cleanedResponse)
    
    console.log("🎯 Successfully generated outbreak stock insights")
    
    return {
      success: true,
      data: processedInsights
    }
    
  } catch (error) {
    console.error("❌ Error generating outbreak stock insights:", error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze stock preparedness"
    }
  }
}

// Helper function to clean response text of unwanted formatting
function cleanResponseText(text: string): string {
  return text
    .replace(/\*\*/g, '') // Remove bold markdown
    .replace(/\*/g, '') // Remove asterisks
    .replace(/#{1,6}\s/g, '') // Remove markdown headers
    .replace(/`{1,3}/g, '') // Remove code blocks
    .trim()
}

// Helper function to create detailed prompt for stock preparedness analysis
function createStockPreparednessPrompt(data: OutbreakStockData): string {
  const { outbreakForecast, currentStock, selectedCategory } = data
  
  // Create medicine inventory summary
  const medicineInventory = currentStock.medicines
    .map(med => `- ${med.name}: ${med.currentQuantity} units (${med.daysRemaining} days supply, Category: ${med.category})`)
    .join('\n')
  
  // Calculate total inventory metrics
  const totalMedicines = currentStock.medicines.length
  const averageDaysSupply = currentStock.medicines.length > 0 
    ? Math.round(currentStock.medicines.reduce((sum, med) => sum + med.daysRemaining, 0) / currentStock.medicines.length)
    : 0
  
  // Identify critical medicines (less than 30 days supply)
  const criticalMedicines = currentStock.medicines.filter(med => med.daysRemaining < 30)
  
  const prompt = `You are a senior pharmaceutical supply chain analyst and outbreak preparedness expert with 15+ years of experience in hospital inventory management during health emergencies.

OUTBREAK FORECAST ANALYSIS:
Disease Category: ${selectedCategory}
Outbreak Severity: ${outbreakForecast.severity}
Timeline: ${outbreakForecast.timeline}
Affected Population: ${outbreakForecast.affectedPopulation || 'Unknown'}
Outbreak Velocity: ${outbreakForecast.outbreakVelocity || 'Not specified'}
Doubling Time: ${outbreakForecast.doublingTime || 'Not specified'}

CURRENT INVENTORY STATUS:
Total Medicines Tracked: ${totalMedicines}
Average Days Supply: ${averageDaysSupply} days
Total Healthcare Units: ${currentStock.totalUnits}
Critical Stock Items (< 30 days): ${criticalMedicines.length}

DETAILED MEDICINE INVENTORY:
${medicineInventory}

CRITICAL ANALYSIS REQUIREMENTS:
1. Assess outbreak preparedness based on disease category and current stock levels
2. Calculate surge demand multipliers for the specific disease type (typically 2-5x normal consumption)
3. Identify immediate procurement priorities with specific quantities
4. Evaluate geographic distribution risks across units
5. Consider medicine shelf life and expiry risks during extended outbreak periods
6. Provide cost-effective procurement strategies
7. Include contingency plans for supply chain disruptions

RESPONSE FORMAT REQUIREMENTS:
- NO asterisks, stars, or markdown formatting anywhere
- Use clear section headers exactly as specified
- Include specific quantities and timeframes
- Provide actionable recommendations with priority levels
- Calculate numeric projections where possible
- DO NOT include cost estimates or pricing information

Format your response EXACTLY as follows:

STOCK PREPAREDNESS SUMMARY:
[Provide a comprehensive 3-4 sentence assessment of overall preparedness level, highlighting the most critical gaps and overall readiness score out of 10]

KEY FINDINGS:
[List 4-6 specific findings about current stock status versus outbreak requirements, include percentages and specific medicine categories]

PROCUREMENT RECOMMENDATIONS:
[List 5-8 specific procurement actions with medicine names, quantities, timeframes, and priority levels (URGENT/HIGH/MEDIUM). Focus on actionable procurement guidance without cost estimates]

RISK MITIGATION:
[List 4-6 specific risk mitigation strategies including alternative medicine protocols, redistribution plans, emergency supplier contacts, and contingency measures for supply chain disruptions]

IMPORTANT: Focus specifically on ${selectedCategory} related medicines and provide numerical analysis wherever possible. Consider both immediate needs (next 30 days) and extended outbreak scenarios (90+ days). Do not include any cost estimation placeholders or pricing information.`

  return prompt
}

// Process the AI response into structured sections
function processStockInsightsResponse(text: string): StockInsightsResponse {
  try {
    // Extract sections using more flexible regex patterns
    const summaryMatch = text.match(/STOCK PREPAREDNESS SUMMARY:\s*([\s\S]*?)(?=KEY FINDINGS:|$)/i)
    const findingsMatch = text.match(/KEY FINDINGS:\s*([\s\S]*?)(?=PROCUREMENT RECOMMENDATIONS:|$)/i)
    const recommendationsMatch = text.match(/PROCUREMENT RECOMMENDATIONS:\s*([\s\S]*?)(?=RISK MITIGATION:|$)/i)
    const riskMitigationMatch = text.match(/RISK MITIGATION:\s*([\s\S]*?)$/i)
    
    const summary = summaryMatch?.[1]?.trim() || "Unable to generate summary. Please try again."
    
    const keyFindings = findingsMatch?.[1] 
      ? extractBulletPoints(findingsMatch[1])
      : ["Analysis could not be completed. Please regenerate insights."]
    
    const recommendations = recommendationsMatch?.[1]
      ? extractBulletPoints(recommendationsMatch[1])
      : ["No specific recommendations available. Please try again."]
    
    const riskMitigation = riskMitigationMatch?.[1]
      ? extractBulletPoints(riskMitigationMatch[1])
      : ["Risk mitigation strategies unavailable. Please regenerate."]
    
    return {
      summary,
      keyFindings,
      recommendations,
      riskMitigation
    }
    
  } catch (error) {
    console.error("Error processing stock insights response:", error)
    
    return {
      summary: "Error processing analysis results. Please try regenerating insights.",
      keyFindings: ["Unable to process findings from AI response"],
      recommendations: ["Unable to extract recommendations"],
      riskMitigation: ["Unable to determine risk mitigation strategies"]
    }
  }
}

// Helper to extract bullet points from text sections
function extractBulletPoints(text: string): string[] {
  const lines = text.split('\n')
  const bulletPoints: string[] = []
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Skip empty lines
    if (!trimmedLine) continue
    
    // Remove common bullet point indicators and clean up
    const cleanedLine = trimmedLine
      .replace(/^[-•·▪▫◦‣⁃]\s*/, '') // Remove bullet indicators
      .replace(/^\d+\.\s*/, '') // Remove numbered lists
      .replace(/^[a-zA-Z]\.\s*/, '') // Remove lettered lists
      .trim()
    
    // Only add non-empty lines with substantial content
    if (cleanedLine && cleanedLine.length > 10) {
      bulletPoints.push(cleanedLine)
    }
  }
  
  // If no bullet points found, try to split by sentences
  if (bulletPoints.length === 0) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
    return sentences.slice(0, 6).map(s => s.trim())
  }
  
  return bulletPoints.slice(0, 8) // Limit to maximum 8 points
}