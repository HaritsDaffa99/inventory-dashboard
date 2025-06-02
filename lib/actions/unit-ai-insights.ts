"use server"

import { GoogleGenerativeAI } from "@google/generative-ai";

// Type definitions for better type safety
interface UnitMetrics {
  totalMedicines: number;
  totalValue: number;
  lowStockCount: number;
  expiringCount: number;
  averageConsumption: number;
}

interface InventorySummary {
  totalItems: number;
  totalValue: number;
  categories: string[];
  averageStockLevel: number;
}

interface ConditionData {
  condition: string;
  count: number;
  percentage: number;
}

interface StockHistoryEntry {
  date: string;
  quantity: number;
  medicineId: number;
  medicineName: string;
}

interface ExpiryData {
  medicineId: number;
  medicineName: string;
  expiryDate: string;
  quantity: number;
  daysUntilExpiry: number;
}

interface TopMedicine {
  medicineId: number;
  medicineName: string;
  quantity: number;
  value: number;
}

interface LowStockItem {
  medicineId: number;
  medicineName: string;
  currentStock: number;
  minimumStock: number;
  deficit: number;
}

interface UnitInsightsData {
  unitId: number;
  unitName: string;
  metrics: UnitMetrics;
  selectedMedicines: number[];
  inventorySummary?: InventorySummary;
  conditionData?: ConditionData[];
  stockHistory?: StockHistoryEntry[];
  expiryData?: ExpiryData[];
  topMedicines?: TopMedicine[];
  lowStockItems?: LowStockItem[];
}

// Access API key
const API_KEY = process.env.GEMINI_API_KEY;

export async function getUnitInsights(data: UnitInsightsData) {
  try {
    // Check for API key before proceeding
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }
    
    // Initialize with API key
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = createUnitPrompt(data);
    console.log(`Sending prompt to Gemini API for unit ${data.unitId}...`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response of any unintended stars or formatting issues
    const cleanedText = cleanResponseText(text);
    
    return {
      success: true,
      data: processInsightsResponse(cleanedText)
    };
  } catch (error) {
    console.error("Error generating unit insights:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Helper function to clean response text of unwanted stars/asterisks
function cleanResponseText(text: string): string {
  // Replace standalone asterisks not part of actual content
  return text
    .replace(/^\s*\*\*\s*$/gm, "") // Remove lines that only contain asterisks
    .replace(/^\s*\*\s*$/gm, "");  // Remove lines that only contain a single asterisk
}

// Helper function to create a detailed prompt specific to unit data
function createUnitPrompt(data: UnitInsightsData): string {
  const { 
    unitId, 
    unitName, 
    metrics, 
    selectedMedicines, 
    inventorySummary,
    conditionData, 
    stockHistory, 
    expiryData, 
    topMedicines,
    lowStockItems
  } = data;
  
  let prompt = `You are a senior pharmaceutical inventory analyst providing data-driven insights for healthcare executives.
  
  Analyze the following medical inventory data for the unit "${unitName}" (ID: ${unitId}). The user already has this dashboard, so don't just summarize visible data. Instead:
  
  1. Provide a precise executive summary (150-200 words) that highlights urgent issues and quantifies their impact
  2. Identify 3-4 key observations, focusing on subtle patterns and critical issues with specific numbers and percentages
  3. Deliver 2-3 concrete, actionable strategic recommendations specific to this unit
  4. Uncover 3 hidden trends by connecting data points across different metrics
  
  IMPORTANT FORMATTING INSTRUCTIONS:
  - DO NOT use asterisks (*) or stars anywhere in your response
  - DO NOT start any bullet points with asterisks
  - Include specific numbers and percentages in your analysis
  - Make insights substantive but concise (each point 2-4 sentences)
  - Include actual quantities, values and metrics in your observations
  
  For strategic recommendations:
  - Focus on specific inventory adjustments and process improvements based on the data
  - Provide actionable next steps that leverage the existing dashboard capabilities
  - Quantify potential benefits of implementing your recommendations
  
  When analyzing trends:
  - Identify correlations between seemingly unrelated metrics with supporting numbers
  - Connect consumption patterns with broader inventory management implications
  - Quantify the financial or operational impact of identified trends
  - Find seasonal or cyclical patterns in the data
  
  ${selectedMedicines.length > 0 ? 
    `Note: The user has filtered the data to focus on specific medicines (IDs: ${selectedMedicines.join(", ")}). Focus your analysis on these filtered items.` : 
    "The analysis covers all inventory items in this unit."
  }
  
  FORMAT YOUR RESPONSE WITH THESE EXACT HEADERS:
  "EXECUTIVE SUMMARY:"
  "KEY OBSERVATIONS:"
  "STRATEGIC RECOMMENDATIONS:" 
  "TREND ANALYSIS:"\n\n`;
  
  // Add inventory summary
  if (inventorySummary) {
    prompt += `UNIT INVENTORY SUMMARY:\n${JSON.stringify(inventorySummary, null, 2)}\n\n`;
  }
  
  // Add metrics data
  if (metrics) {
    prompt += `UNIT METRICS:\n${JSON.stringify(metrics, null, 2)}\n\n`;
  }
  
  // Add condition data
  if (conditionData) {
    prompt += `CONDITION DISTRIBUTION:\n${JSON.stringify(conditionData, null, 2)}\n\n`;
  }
  
  // Add stock history
  if (stockHistory) {
    prompt += `STOCK HISTORY (LAST 6 MONTHS):\n${JSON.stringify(stockHistory, null, 2)}\n\n`;
  }
  
  // Add expiry data
  if (expiryData) {
    prompt += `MEDICINES APPROACHING EXPIRY:\n${JSON.stringify(expiryData, null, 2)}\n\n`;
  }
  
  // Add top medicines
  if (topMedicines) {
    prompt += `TOP MEDICINES BY QUANTITY:\n${JSON.stringify(topMedicines, null, 2)}\n\n`;
  }
  
  // Add low stock items
  if (lowStockItems) {
    prompt += `LOW STOCK WARNINGS:\n${JSON.stringify(lowStockItems, null, 2)}\n\n`;
  }
  
  return prompt;
}

// Process the response into structured sections
function processInsightsResponse(text: string): {
  summary: string;
  keyPoints: string[];
  recommendations: string[];
  trends: string[];
} {
  // Default structure with explicit type annotations
  const result: {
    summary: string;
    keyPoints: string[];
    recommendations: string[];
    trends: string[];
  } = {
    summary: "",
    keyPoints: [] as string[],
    recommendations: [] as string[],
    trends: [] as string[]
  };
  
  // Extract sections using regex
  const summaryMatch = text.match(/EXECUTIVE SUMMARY:([\s\S]*?)(?=KEY OBSERVATIONS:|$)/i);
  if (summaryMatch && summaryMatch[1]) {
    result.summary = summaryMatch[1].trim();
  }
  
  const keyPointsMatch = text.match(/KEY OBSERVATIONS:([\s\S]*?)(?=STRATEGIC RECOMMENDATIONS:|$)/i);
  if (keyPointsMatch && keyPointsMatch[1]) {
    result.keyPoints = extractBulletPoints(keyPointsMatch[1]);
  }
  
  const recommendationsMatch = text.match(/STRATEGIC RECOMMENDATIONS:([\s\S]*?)(?=TREND ANALYSIS:|$)/i);
  if (recommendationsMatch && recommendationsMatch[1]) {
    result.recommendations = extractBulletPoints(recommendationsMatch[1]);
  }
  
  const trendsMatch = text.match(/TREND ANALYSIS:([\s\S]*?)$/i);
  if (trendsMatch && trendsMatch[1]) {
    result.trends = extractBulletPoints(trendsMatch[1]);
  }
  
  return result;
}

// Helper to extract bullet points from text
function extractBulletPoints(text: string): string[] {
  // Split by common bullet point indicators
  const lines = text.split('\n');
  const points: string[] = [];
  let currentPoint = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Check if this line starts a new point
    const isBulletPoint = /^[•\-–—]|\d+[.)]|[A-Z][.)]/.test(trimmedLine);
    
    if (isBulletPoint || (points.length === 0 && trimmedLine.length > 10)) {
      // Save the previous point if it exists
      if (currentPoint) {
        points.push(currentPoint.trim());
      }
      
      // Start a new point, removing the bullet character
      currentPoint = trimmedLine.replace(/^[•\-–—]\s*|\d+[.)]\s*|[A-Z][.)]\s*/, '');
    } else if (currentPoint) {
      // Continue the current point
      currentPoint += ' ' + trimmedLine;
    } else {
      // Start the first point if no bullet detected
      currentPoint = trimmedLine;
    }
  }
  
  // Don't forget the last point
  if (currentPoint) {
    points.push(currentPoint.trim());
  }
  
  // Final cleanup
  return points
    .filter(point => point.length > 10)
    .map(point => point.replace(/^\s*[*]+\s*|\s*[*]+\s*$/, '')) // Remove asterisks at beginning or end
    .map(point => point.replace(/\s{2,}/g, ' ')); // Normalize whitespace
}