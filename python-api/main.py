from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
from models.forecasting import ForecastingModel
from routes.disease_outbreak_routes import router as disease_outbreak_router  # ADD THIS
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Medicine Forecasting API",
    description="Prophet-based forecasting with Medicine Demand and Disease Outbreak prediction",  # UPDATED
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include disease outbreak routes  # ADD THIS
app.include_router(disease_outbreak_router)

# Initialize forecasting model
forecasting_model = ForecastingModel()

# Pydantic models for request/response
class HistoricalDataPoint(BaseModel):
    date: str  # YYYY-MM-DD format
    usage: float

class ForecastRequest(BaseModel):
    unit_id: int
    medicine_id: int
    historical_data: List[Dict[str, Any]]
    periods: int = 6
    train_test_split: float = 0.8
    include_holidays: bool = False
    model_mode: str = "fast"  # "fast", "enhanced", or "comprehensive"

class ForecastResponse(BaseModel):
    success: bool
    unit_id: int
    medicine_id: int
    model_type: str
    model_parameters: Dict[str, Any]
    historical_data: List[Dict[str, Any]]
    forecast_data: List[Dict[str, Any]]
    summary: Dict[str, Any]
    recommendations: Dict[str, Any]
    metrics: Dict[str, Any]
    error: Optional[str] = None

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Medicine Forecasting API - Prophet Multi-Mode + Disease Outbreak Prediction",  # UPDATED
        "version": "1.0.0",
        "status": "operational",
        "model": "Facebook Prophet",
        "modes": ["fast", "enhanced", "comprehensive"],
        "services": ["medicine-demand-forecasting", "disease-outbreak-prediction"]  # ADD THIS
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": "Prophet",
        "modes": ["fast", "enhanced", "comprehensive"],
        "services": ["medicine-demand", "disease-outbreak"],  # ADD THIS
        "version": "1.0.0"
    }

@app.post("/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """
    Generate Prophet forecast from historical data with specified mode
    """
    try:
        logger.info(f"Generating forecast for Unit {request.unit_id}, Medicine {request.medicine_id}")
        logger.info(f"Model mode: {request.model_mode.upper()}")
        logger.info(f"Periods: {request.periods}, Include holidays: {request.include_holidays}")
        
        # Validate model mode
        valid_modes = ["fast", "enhanced", "comprehensive"]
        if request.model_mode not in valid_modes:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid model mode '{request.model_mode}'. Must be one of: {valid_modes}"
            )
        
        # Generate forecast using Prophet
        result = forecasting_model.generate_forecast(
            unit_id=request.unit_id,
            medicine_id=request.medicine_id,
            historical_data=request.historical_data,
            periods=request.periods,
            train_test_split=request.train_test_split,
            include_holidays=request.include_holidays,
            model_mode=request.model_mode
        )
        
        logger.info(f"Forecast generation completed. Success: {result['success']}")
        
        return ForecastResponse(**result)
        
    except Exception as e:
        logger.error(f"Error generating forecast: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test/{mode}")
async def test_forecast(mode: str = "fast"):
    """Test endpoint with sample data for different modes"""
    valid_modes = ["fast", "enhanced", "comprehensive"]
    if mode not in valid_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode. Must be one of: {valid_modes}"
        )
    
    sample_data = [
        {"date": "2023-01-01", "usage": 99.5},
        {"date": "2023-02-01", "usage": 101.2},
        {"date": "2023-03-01", "usage": 98.8},
        {"date": "2023-04-01", "usage": 102.1},
        {"date": "2023-05-01", "usage": 97.9},
        {"date": "2023-06-01", "usage": 103.4},
        {"date": "2023-07-01", "usage": 99.1},
        {"date": "2023-08-01", "usage": 100.8},
        {"date": "2023-09-01", "usage": 98.5},
        {"date": "2023-10-01", "usage": 101.7},
        {"date": "2023-11-01", "usage": 99.9},
        {"date": "2023-12-01", "usage": 100.3},
    ]
    
    request = ForecastRequest(
        unit_id=6,
        medicine_id=13,
        historical_data=sample_data,
        periods=6,
        include_holidays=False,
        model_mode=mode
    )
    
    return await generate_forecast(request)

@app.get("/model-info")
async def model_info():
    """Get information about the Prophet model modes"""
    return {
        "model_name": "Facebook Prophet",
        "description": "Multi-mode forecasting with speed/accuracy trade-offs",
        "modes": {
            "fast": {
                "description": "Uses default parameters, runs in seconds",
                "runtime": "~10 seconds",
                "accuracy": "Good",
                "use_case": "Quick exploration"
            },
            "enhanced": {
                "description": "Data-driven parameter selection with enhanced seasonality",
                "runtime": "~1-2 minutes", 
                "accuracy": "Very Good",
                "use_case": "Balanced production use"
            },
            "comprehensive": {
                "description": "Full cross-validation and parameter optimization",
                "runtime": "~5+ minutes",
                "accuracy": "Excellent", 
                "use_case": "Maximum accuracy needed"
            }
        },
        "features": [
            "Automatic seasonality detection",
            "Trend changepoint detection", 
            "Holiday effects",
            "Missing data handling",
            "Uncertainty intervals",
            "Data-driven parameter selection (enhanced mode)",
            "Enhanced seasonality modeling (enhanced mode)",
            "Cross-validation parameter tuning (comprehensive mode)"
        ]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)