from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from models.disease_outbreak import DiseaseOutbreakModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/disease-outbreak", tags=["Disease Outbreak Forecasting"])

# Initialize disease outbreak model
disease_model = DiseaseOutbreakModel()

# Pydantic models for requests/responses
class DiseaseDataPoint(BaseModel):
    month: str  # YYYY-MM format
    usage: float
    category_id: str

class OutbreakForecastRequest(BaseModel):
    category_id: str
    historical_data: List[Dict[str, Any]]
    periods: int = 12

class BatchOutbreakRequest(BaseModel):
    categories: List[Dict[str, Any]]
    periods: int = 12

class AnomalyDetectionRequest(BaseModel):
    category_id: str
    recent_data: List[Dict[str, Any]]

@router.get("/health")
async def health_check():
    """Health check for disease outbreak service"""
    return {
        "status": "healthy",
        "service": "Disease Outbreak Prediction",
        "model": "Prophet-based Epidemiological Forecasting"
    }

@router.post("/train-model")
async def train_outbreak_model(request: OutbreakForecastRequest):
    """Train Prophet model for specific disease category"""
    try:
        logger.info(f"Training outbreak model for category: {request.category_id}")
        
        result = disease_model.train_outbreak_model(
            category_id=request.category_id,
            historical_data=request.historical_data,
            model_mode="enhanced"
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except Exception as e:
        logger.error(f"Model training failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-forecast")
async def generate_outbreak_forecast(request: OutbreakForecastRequest):
    """Generate disease outbreak forecast using Prophet"""
    try:
        logger.info(f"Generating outbreak forecast for: {request.category_id}")
        logger.info(f"Historical data points: {len(request.historical_data)}")
        logger.info(f"Forecast periods: {request.periods}")
        
        result = disease_model.generate_outbreak_forecast(
            category_id=request.category_id,
            historical_data=request.historical_data,
            periods=request.periods
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        logger.info(f"Forecast generated successfully for {request.category_id}")
        return result
        
    except Exception as e:
        logger.error(f"Outbreak forecast failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect-anomalies")
async def detect_outbreak_anomalies(request: AnomalyDetectionRequest):
    """Detect anomalies that might indicate disease outbreaks"""
    try:
        logger.info(f"Detecting anomalies for category: {request.category_id}")
        
        result = disease_model.detect_outbreak_anomalies(
            category_id=request.category_id,
            recent_data=request.recent_data
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except Exception as e:
        logger.error(f"Anomaly detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-forecast")
async def batch_outbreak_forecast(request: BatchOutbreakRequest):
    """Generate outbreak forecasts for multiple disease categories"""
    try:
        logger.info(f"🚀 Batch forecast request received")
        logger.info(f"📊 Categories: {len(request.categories)}")
        logger.info(f"🔮 Periods: {request.periods}")
        
        # ✅ FIX: Log incoming data structure
        for i, category in enumerate(request.categories[:2]):  # Log first 2 categories
            logger.info(f"📋 Category {i+1}: {category.get('category_id')} with {len(category.get('historical_data', []) )} data points")
            
        result = disease_model.batch_outbreak_forecast(
            categories_data=request.categories,
            periods=request.periods
        )
        
        logger.info(f"✅ Batch forecast completed: {result.get('successful_forecasts', 0)}/{result.get('total_categories', 0)} successful")
        return result
        
    except Exception as e:
        logger.error(f"❌ Batch forecast endpoint failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/model-info")
async def get_model_info():
    """Get information about the disease outbreak forecasting model"""
    return {
        "model_name": "Disease Outbreak Prophet",
        "description": "Epidemiological forecasting specialized for disease outbreak prediction",
        "base_model": "Facebook Prophet (Enhanced Mode)",
        "features": [
            "Seasonal disease pattern detection",
            "Outbreak threshold analysis",
            "Anomaly detection for unusual usage spikes",
            "Confidence interval predictions",
            "Holiday and event effect modeling",
            "Multi-category batch processing"
        ],
        "use_cases": [
            "Respiratory disease outbreak prediction",
            "Vaccine-preventable disease monitoring",
            "Emergency/zoonotic disease surveillance",
            "Childhood immunization trend analysis"
        ],
        "output_metrics": [
            "Outbreak probability estimation",
            "Risk level classification",
            "Seasonal pattern analysis",
            "Trend strength assessment",
            "Anomaly severity scoring"
        ]
    }