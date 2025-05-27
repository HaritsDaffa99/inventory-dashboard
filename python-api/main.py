from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn
from models.forecasting import ForecastingModel
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Medicine Forecasting API",
    description="Real ARIMA/SARIMA forecasting for medicine usage",
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

# Initialize forecasting model
forecasting_model = ForecastingModel()

# Pydantic models for request/response
class HistoricalDataPoint(BaseModel):
    date: str  # YYYY-MM-DD format
    usage: float

class ForecastRequest(BaseModel):
    unit_id: int
    medicine_id: int
    historical_data: List[HistoricalDataPoint]
    periods: int = 6
    train_test_split: float = 0.8

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
    error: str = None

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Medicine Forecasting API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected",
        "message": "API is operational",
        "version": "1.0.0"
    }

@app.post("/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """
    Generate ARIMA/SARIMA forecast from historical data
    """
    try:
        logger.info(f"Generating forecast for Unit {request.unit_id}, Medicine {request.medicine_id}")
        
        # Convert historical data to the format expected by forecasting model
        historical_data = [
            {"date": point.date, "usage": point.usage} 
            for point in request.historical_data
        ]
        
        # Generate forecast using ARIMA/SARIMA
        result = forecasting_model.generate_forecast(
            unit_id=request.unit_id,
            medicine_id=request.medicine_id,
            historical_data=historical_data,
            periods=request.periods,
            train_test_split=request.train_test_split
        )
        
        logger.info(f"Forecast generated successfully: {result['model_type']}")
        return ForecastResponse(**result)
        
    except Exception as e:
        logger.error(f"Forecast generation failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Forecast generation failed: {str(e)}"
        )

@app.get("/test")
async def test_forecast():
    """Test endpoint with sample data"""
    sample_data = [
        {"date": "2023-01-01", "usage": 85},
        {"date": "2023-02-01", "usage": 90},
        {"date": "2023-03-01", "usage": 88},
        {"date": "2023-04-01", "usage": 92},
        {"date": "2023-05-01", "usage": 87},
        {"date": "2023-06-01", "usage": 95},
    ]
    
    request = ForecastRequest(
        unit_id=1,
        medicine_id=1,
        historical_data=[HistoricalDataPoint(**point) for point in sample_data],
        periods=3
    )
    
    return await generate_forecast(request)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
