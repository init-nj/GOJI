from typing import Annotated
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime

from models import CompanySettings
from database import SessionLocal
from routers.auth import get_current_user

router = APIRouter(
    prefix="/company",
    tags=["company"]
)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

# ------------------- SCHEMAS -------------------

class CompanySettingsCreate(BaseModel):
    company_name: str
    industry: str | None = None
    currency: str = 'USD'
    financial_year_start: int = 1
    default_working_days: int = 22
    total_budget: float | None = None
    monthly_budget_limit: float | None = None

class CompanySettingsUpdate(BaseModel):
    company_name: str | None = None
    industry: str | None = None
    currency: str | None = None
    financial_year_start: int | None = None
    default_working_days: int | None = None
    total_budget: float | None = None
    monthly_budget_limit: float | None = None

# ------------------- ENDPOINTS -------------------

@router.post("/settings")
async def create_company_settings(
    user: user_dependency,
    db: db_dependency,
    settings: CompanySettingsCreate
):
    """Create company settings (onboarding step)"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check if user already has company settings
    existing = db.query(CompanySettings).filter(
        CompanySettings.user_id == user.get("id")
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Company settings already exist")
    
    company = CompanySettings(
        user_id=user.get("id"),
        company_name=settings.company_name,
        industry=settings.industry,
        currency=settings.currency,
        financial_year_start=settings.financial_year_start,
        default_working_days=settings.default_working_days,
        total_budget=settings.total_budget,
        monthly_budget_limit=settings.monthly_budget_limit
    )
    
    db.add(company)
    db.commit()
    db.refresh(company)
    
    return {
        "message": "Company settings created successfully",
        "company": {
            "id": company.id,
            "company_name": company.company_name,
            "currency": company.currency
        }
    }

@router.get("/settings")
async def get_company_settings(user: user_dependency, db: db_dependency):
    """Get current user's company settings"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    settings = db.query(CompanySettings).filter(
        CompanySettings.user_id == user.get("id")
    ).first()
    
    if not settings:
        raise HTTPException(status_code=404, detail="Company settings not found")
    
    return settings

@router.put("/settings")
async def update_company_settings(
    user: user_dependency,
    db: db_dependency,
    updates: CompanySettingsUpdate
):
    """Update company settings"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    settings = db.query(CompanySettings).filter(
        CompanySettings.user_id == user.get("id")
    ).first()
    
    if not settings:
        raise HTTPException(status_code=404, detail="Company settings not found")
    
    # Update only provided fields
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(settings, field, value)
    
    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    
    return {
        "message": "Company settings updated successfully",
        "company": settings
    }