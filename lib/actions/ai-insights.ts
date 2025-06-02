"use server"

import { GoogleGenerativeAI } from "@google/generative-ai";

// Define proper interfaces for the data structures
interface MetricsData {
  totalInventory?: { value: number; change: number };
  totalReceipts?: { value: number; change: number };
  totalDispensed?: { value: number; change: number };
  expiredMedicines?: { value: number; change: number };
  availableItems?: { value: number; change: number };
  damagedItems?: { value: number; change: number };
}

interface ConditionData {
  name: string;
  value: number;
  percentage: number;
}

interface TopItem {
  id: number;
  name: string;
  code?: string;
  quantity?: number;
  stock?: number;
  unit?: string;
  value?: number;
  percentage?: number;
}

interface DashboardData {
  metrics: MetricsData;
  selectedMedicines: number[];
  conditionData?: ConditionData[];
  topReceivedItems?: TopItem[];
  topDispensedItems?: TopItem[];
  topItemsByQuantity?: TopItem[];
}

interface InsightsResponse {
  summary: string;
  keyPoints: string[];
  recommendations: string[];
  trends: string[];
}

// Access API key and add debugging
const API_KEY = process.env.GEMINI_API_KEY;
console.log("API Key available:", API_KEY ? "Yes (length: " + API_KEY.length + ")" : "No");

export async function getDashboardInsights(data: DashboardData) {
  try {
    // Check for API key before proceeding
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }
    
    // Initialize with the explicit API key variable
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = createDashboardPrompt(data);
    console.log("Sending prompt to Gemini API...");
    
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
    console.error("Error generating dashboard insights:", error);
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

// Helper function to create a detailed prompt for dashboard insights
function createDashboardPrompt(data: DashboardData): string {
  const { metrics, selectedMedicines, conditionData, topReceivedItems, topDispensedItems, topItemsByQuantity } = data;
  
  let prompt = `You are a senior pharmaceutical inventory analyst providing data-driven insights for healthcare executives.
  
  Analyze the following medical inventory data across the entire facility. The user already has this dashboard, so don't just summarize visible data. Instead:
  
  1. Provide a precise executive summary (150-200 words) that highlights urgent issues and quantifies their impact
  2. Identify 3-4 key observations, focusing on subtle patterns and critical issues with specific numbers and percentages
  3. Deliver 2-3 concrete, actionable strategic recommendations for inventory optimization
  4. Uncover 3 hidden trends by connecting data points across different metrics
  
  IMPORTANT FORMATTING INSTRUCTIONS:
  - DO NOT use asterisks (*) or stars anywhere in your response
  - DO NOT start any bullet points with asterisks
  - ALWAYS format your bullet points with a descriptive title followed by a colon, like "Title: Description"
  - For example: "High Expiry Rate: 3662 damaged or expired units represent over 10% of total inventory..."
  - For recommendations, always start with an action verb like "Implement", "Enhance", "Conduct", etc.
  - For trends, use descriptive phrases that highlight the relationship or insight
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
    "The analysis covers all inventory items across the facility."
  }
  
  FORMAT YOUR RESPONSE WITH THESE EXACT HEADERS:
  "EXECUTIVE SUMMARY:"
  "KEY OBSERVATIONS:"
  "STRATEGIC RECOMMENDATIONS:" 
  "TREND ANALYSIS:"\n\n`;
  
  // Add metrics data
  if (metrics) {
    prompt += `INVENTORY METRICS:\n${JSON.stringify(metrics, null, 2)}\n\n`;
  }
  
  // Add condition data
  if (conditionData && conditionData.length > 0) {
    prompt += `CONDITION DISTRIBUTION:\n${JSON.stringify(conditionData, null, 2)}\n\n`;
  }
  
  // Add top received items
  if (topReceivedItems && topReceivedItems.length > 0) {
    prompt += `TOP RECEIVED ITEMS:\n${JSON.stringify(topReceivedItems, null, 2)}\n\n`;
  }
  
  // Add top dispensed items
  if (topDispensedItems && topDispensedItems.length > 0) {
    prompt += `TOP DISPENSED ITEMS:\n${JSON.stringify(topDispensedItems, null, 2)}\n\n`;
  }
  
  // Add top items by quantity
  if (topItemsByQuantity && topItemsByQuantity.length > 0) {
    prompt += `TOP ITEMS BY QUANTITY:\n${JSON.stringify(topItemsByQuantity, null, 2)}\n\n`;
  }
  
  return prompt;
}

// Process the response into structured sections
function processInsightsResponse(text: string): InsightsResponse {
  // Default structure
  const result: InsightsResponse = {
    summary: "",
    keyPoints: [],
    recommendations: [],
    trends: []
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