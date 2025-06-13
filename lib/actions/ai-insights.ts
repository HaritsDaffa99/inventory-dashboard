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
  
  let prompt = `You are a senior pharmaceutical procurement analyst with 15+ years of experience in healthcare supply chain optimization. 

  Analyze this procurement and inventory data to uncover hidden patterns, inefficiencies, and strategic opportunities. Go beyond surface-level observations to provide deep, actionable intelligence.

  Your analysis should reveal:
  
  1. EXECUTIVE SUMMARY (200-250 words): Quantify the most critical procurement inefficiencies and their operational impact. Include specific ratios, turnover rates, and procurement patterns that executive leadership must address immediately.

  2. PROCUREMENT INTELLIGENCE (4-5 insights): Uncover hidden procurement patterns by analyzing:
     - Demand-supply imbalances with specific quantity gaps
     - Procurement frequency vs consumption velocity ratios
     - Stock accumulation patterns indicating over-ordering or under-utilization
     - Expiry-to-receipt ratios revealing procurement timing issues
     - Cross-category procurement efficiency variations

  3. STRATEGIC PROCUREMENT ACTIONS (3-4 recommendations): Provide data-backed procurement strategies:
     - Specific quantity adjustments for high-variance items
     - Procurement cycle optimization based on consumption patterns
     - Supplier consolidation opportunities based on volume analysis
     - Just-in-time ordering implementation for specific categories

  4. PREDICTIVE PROCUREMENT TRENDS (3-4 trends): Connect data points to predict:
     - Future stockout risks based on current consumption vs receipt patterns
     - Seasonal procurement adjustments needed based on dispensing trends
     - Category-specific procurement optimization opportunities
     - Cost-saving potential through procurement pattern changes

  CRITICAL ANALYSIS REQUIREMENTS:
  - Calculate and include procurement efficiency ratios (received vs dispensed, stock turnover rates)
  - Identify procurement outliers with specific quantity deviations
  - Quantify waste through expired items and correlate with procurement timing
  - Reveal procurement gaps where high-demand items have insufficient stock levels
  - Calculate optimal reorder points based on current consumption velocity
  - Identify overstocked categories consuming unnecessary working capital

  FORMATTING RULES:
  - NO asterisks or stars anywhere
  - Use descriptive titles with colons: "Procurement Pattern: Description with numbers"
  - Include specific quantities, ratios, and percentages in every insight
  - Each insight must contain at least 2-3 specific numerical findings
  - Connect seemingly unrelated metrics to reveal procurement inefficiencies
  - Quantify financial impact where possible (working capital, waste costs)

  ${selectedMedicines.length > 0 ? 
    `FOCUS AREA: Analysis filtered to medicines with IDs: ${selectedMedicines.join(", ")}. Deep-dive into procurement patterns for these specific items.` : 
    "SCOPE: Complete facility-wide procurement analysis across all categories."
  }

  RESPONSE FORMAT:
  "PROCUREMENT EXECUTIVE SUMMARY:"
  "PROCUREMENT INTELLIGENCE:"
  "STRATEGIC PROCUREMENT ACTIONS:"
  "PREDICTIVE PROCUREMENT TRENDS:"\n\n`;

  // Add metrics with procurement context
  if (metrics) {
    prompt += `PROCUREMENT METRICS:
- Total Inventory: ${metrics.totalInventory?.value || 0} units (${metrics.totalInventory?.change || 0}% change)
- Total Receipts: ${metrics.totalReceipts?.value || 0} units (${metrics.totalReceipts?.change || 0}% change)
- Total Dispensed: ${metrics.totalDispensed?.value || 0} units (${metrics.totalDispensed?.change || 0}% change)
- Expired/Damaged: ${metrics.expiredMedicines?.value || 0} units (${metrics.expiredMedicines?.change || 0}% change)
- Available Stock: ${metrics.availableItems?.value || 0} units
- Damaged Units: ${metrics.damagedItems?.value || 0} units

PROCUREMENT EFFICIENCY RATIOS TO ANALYZE:
- Receipt-to-Dispensing Ratio: ${metrics.totalReceipts?.value || 0} / ${metrics.totalDispensed?.value || 1} = ${((metrics.totalReceipts?.value || 0) / (metrics.totalDispensed?.value || 1)).toFixed(2)}
- Waste Ratio: ${metrics.expiredMedicines?.value || 0} / ${metrics.totalReceipts?.value || 1} = ${((metrics.expiredMedicines?.value || 0) / (metrics.totalReceipts?.value || 1) * 100).toFixed(2)}%
- Stock Utilization: ${metrics.totalDispensed?.value || 0} / ${metrics.totalInventory?.value || 1} = ${((metrics.totalDispensed?.value || 0) / (metrics.totalInventory?.value || 1) * 100).toFixed(2)}%\n\n`;
  }
  
  // Add condition data with procurement implications
  if (conditionData && conditionData.length > 0) {
    prompt += `CONDITION-BASED PROCUREMENT PATTERNS:
${conditionData.map(condition => 
  `- ${condition.name}: ${condition.value} units (${condition.percentage.toFixed(1)}% of total stock)`
).join('\n')}

ANALYZE: Which conditions show procurement imbalances? Are high-prevalence conditions adequately stocked?\n\n`;
  }
  
  // Add procurement-focused item analysis
  if (topReceivedItems && topReceivedItems.length > 0) {
    prompt += `TOP PROCUREMENT VOLUMES (Recently Received):
${topReceivedItems.map(item => 
  `- ${item.name} (${item.code || 'N/A'}): ${item.quantity || 0} ${item.unit || 'units'} received`
).join('\n')}

PROCUREMENT QUESTION: Are these high-volume receipts aligned with actual demand patterns?\n\n`;
  }
  
  if (topDispensedItems && topDispensedItems.length > 0) {
    prompt += `HIGH-DEMAND ITEMS (Most Dispensed):
${topDispensedItems.map(item => 
  `- ${item.name} (${item.code || 'N/A'}): ${item.quantity || 0} ${item.unit || 'units'} dispensed`
).join('\n')}

PROCUREMENT INSIGHT: Compare with receipt volumes to identify demand-supply gaps.\n\n`;
  }
  
  if (topItemsByQuantity && topItemsByQuantity.length > 0) {
    prompt += `HIGHEST STOCK LEVELS (Current Inventory):
${topItemsByQuantity.map(item => 
  `- ${item.name} (${item.code || 'N/A'}): ${item.stock || 0} ${item.unit || 'units'} in stock`
).join('\n')}

PROCUREMENT ANALYSIS: Identify overstocked items that may indicate procurement inefficiencies or changing demand patterns.\n\n`;
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
  const summaryMatch = text.match(/PROCUREMENT EXECUTIVE SUMMARY:([\s\S]*?)(?=PROCUREMENT INTELLIGENCE:|$)/i);
  if (summaryMatch && summaryMatch[1]) {
    result.summary = summaryMatch[1].trim();
  }
  
  const keyPointsMatch = text.match(/PROCUREMENT INTELLIGENCE:([\s\S]*?)(?=STRATEGIC PROCUREMENT ACTIONS:|$)/i);
  if (keyPointsMatch && keyPointsMatch[1]) {
    result.keyPoints = extractBulletPoints(keyPointsMatch[1]);
  }
  
  const recommendationsMatch = text.match(/STRATEGIC PROCUREMENT ACTIONS:([\s\S]*?)(?=PREDICTIVE PROCUREMENT TRENDS:|$)/i);
  if (recommendationsMatch && recommendationsMatch[1]) {
    result.recommendations = extractBulletPoints(recommendationsMatch[1]);
  }
  
  const trendsMatch = text.match(/PREDICTIVE PROCUREMENT TRENDS:([\s\S]*?)$/i);
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