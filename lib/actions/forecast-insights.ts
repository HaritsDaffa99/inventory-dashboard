"use server"

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ForecastResult, ForecastInsights } from "@/lib/forecasting/types";
import  prisma  from "@/lib/prisma";

// Get current stock level for the forecasted medicine
async function getCurrentStock(unitId: number, medicineId: number): Promise<number> {
  try {
    // Get the latest stock entry for this medicine and unit
    const latestStock = await prisma.stokOpname.findFirst({
      where: {
        persediaanId: medicineId,
        unitId: unitId
      },
      orderBy: {
        id: 'desc' // Use 'id' for ordering since there's no date field in StokOpname
        // Alternative: you could use tanggalExpired if that's appropriate
        // tanggalExpired: 'desc'
      }
    });

    // Use 'jumlah' instead of 'jumlahAkhir' (based on your schema)
    return latestStock?.jumlah || 0;
  } catch (error) {
    console.error("Error getting current stock:", error);
    return 0;
  }
}

function createPrompt(forecastResult: ForecastResult, currentStock: number): string {
  // Create a detailed prompt with all relevant information
  const {
    historical_data,
    forecast_data,
    summary,
    recommendations,
    metrics,
    model_type,
    unit_id,
    medicine_id
  } = forecastResult;

  // Format the data for the AI model
  const formattedHistorical = historical_data.map(item => ({
    date: item.date,
    usage: item.usage
  }));

  const formattedForecast = forecast_data.map(item => ({
    date: item.date,
    forecasted_usage: item.forecasted_usage,
    lower_confidence: item.lower_ci,
    upper_confidence: item.upper_ci
  }));

  // Create prompt with structured data
  return `
You are an inventory management expert working for a healthcare facility. Please analyze this pharmaceutical inventory data and generate detailed, professional recommendations that healthcare staff can easily understand and implement.

## Current Information
- Item: Medicine ID ${medicine_id}
- Unit ID: ${unit_id}
- Current Stock Level: ${currentStock} units
- Forecast Model: ${model_type}
- Forecast Period: ${summary.forecast_period} months
- Historical Average Usage: ${summary.historical_avg.toFixed(2)} units/month
- Forecasted Average Usage: ${summary.avg_monthly.toFixed(2)} units/month
- Current Safety Stock Level: ${recommendations.safety_stock} units
- Current Reorder Point: ${recommendations.reorder_point} units
- Lead Time: ${recommendations.lead_time_months} months
- Service Level: ${recommendations.service_level}
  
## Historical Usage Data (Past ${formattedHistorical.length} months)
${JSON.stringify(formattedHistorical, null, 2)}

## Forecasted Usage Data (Next ${formattedForecast.length} months)
${JSON.stringify(formattedForecast, null, 2)}

## Model Performance Metrics
${metrics ? `
- RMSE: ${metrics.rmse?.toFixed(2) || 'N/A'}
- MAE: ${metrics.mae?.toFixed(2) || 'N/A'}
- MAPE: ${metrics.mape?.toFixed(2) || 'N/A'}%
- Training Data: ${metrics.train_size} months
- Test Data: ${metrics.test_size} months
` : 'No metrics available'}

Based on this comprehensive analysis, please provide detailed insights that healthcare staff can easily understand and act upon:

1. **Executive Summary**: Provide a detailed overview (3-4 sentences) of the inventory situation. Include specific numbers from the forecast, explain the trend (increasing/decreasing/stable), compare current stock vs forecasted needs, and highlight the most critical actions needed. Make it clear and actionable for healthcare administrators.

2. **Stock Recommendations**: Provide 4-6 detailed recommendations with specific calculations and reasoning. Include:
   - Analysis of current safety stock adequacy with calculations
   - Recommended reorder point adjustments with reasoning
   - Optimal order quantities based on forecast data
   - Emergency stock considerations
   - Each recommendation should include the "why" with numbers from the forecast

3. **Monthly Stock Requirements**: For each forecasted month, provide:
   - Recommended stock level to maintain at the beginning of the month
   - Expected consumption for that month (from forecast)
   - Suggested ordering actions if needed
   - Calculate running stock levels and identify when orders should be placed
   - Include buffer considerations for each month

4. **Risk Factors**: Identify 3-4 specific risks with detailed explanations:
   - Model accuracy concerns based on RMSE/MAE values
   - Supply chain vulnerabilities specific to the forecast period
   - Demand variability risks with confidence interval analysis
   - Lead time and seasonality considerations
   - Each risk should include mitigation strategies

Make all explanations clear for healthcare staff who may not be inventory experts. Use specific numbers from the forecast data to support every recommendation. Avoid generic advice - everything should be tailored to this specific medicine and forecast.

Format your response with the following JSON structure:
{
  "executiveSummary": "Your detailed summary with specific numbers and trends...",
  "stockRecommendations": ["Detailed recommendation 1 with calculations", "Detailed recommendation 2 with reasoning", ...],
  "monthlyStockPlan": [{"month": "June 2025", "recommendedStock": "Stock level needed", "expectedUsage": "Forecasted consumption", "orderAction": "Specific ordering action"}, ...],
  "riskFactors": ["Detailed risk factor 1 with mitigation", "Detailed risk factor 2 with analysis", ...]
}
`;
}

// Clean and parse the model response to our expected format
function processResponse(text: string): ForecastInsights {
  try {
    // Extract the JSON part from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }
    
    const jsonText = jsonMatch[0];
    const data = JSON.parse(jsonText);
    
    // Ensure we have all required fields
    return {
      executiveSummary: data.executiveSummary || "No summary available",
      stockRecommendations: Array.isArray(data.stockRecommendations) 
        ? data.stockRecommendations 
        : ["No recommendations available"],
      monthlyStockPlan: Array.isArray(data.monthlyStockPlan) 
        ? data.monthlyStockPlan 
        : [{ month: "No data", recommendedStock: "N/A", expectedUsage: "N/A", orderAction: "No recommendations available" }],
      riskFactors: Array.isArray(data.riskFactors) 
        ? data.riskFactors 
        : ["No risk factors identified"],
    };
  } catch (error) {
    console.error("Error processing AI response:", error);
    
    // Return fallback structure
    return {
      executiveSummary: "Error processing AI insights. Please try again.",
      stockRecommendations: ["Error processing recommendations"],
      monthlyStockPlan: [{ month: "Error", recommendedStock: "N/A", expectedUsage: "N/A", orderAction: "Could not generate monthly plan" }],
      riskFactors: ["Error processing risk factors"],
    };
  }
}

export async function getForecastInsights(forecastResult: ForecastResult): Promise<{ 
  success: boolean; 
  data?: ForecastInsights; 
  error?: string 
}> {
  try {
    // Access API key
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable not found");
    }

    // Get current stock level
    const currentStock = await getCurrentStock(forecastResult.unit_id, forecastResult.medicine_id);
    
    // Create prompt with all relevant data
    const prompt = createPrompt(forecastResult, currentStock);
    
    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // For more complex structured outputs, we use the Gemini-1.5-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    console.log("Generating AI insights for forecast data...");
    
    // Generate content with structured output
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error("Empty response from AI model");
    }
    
    // Process the response into our expected structure
    const insights = processResponse(text);
    
    console.log("AI insights generated successfully");
    
    return {
      success: true,
      data: insights
    };
    
  } catch (error) {
    console.error("Error generating forecast insights:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}