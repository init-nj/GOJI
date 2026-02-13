from typing import Annotated, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel
from datetime import datetime

from models import CategoryBudget, Revenue, CompanySettings, Expense
from database import SessionLocal
from routers.auth import get_current_user

router = APIRouter(
    prefix="/budgets",
    tags=["budgets"]
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

class CategoryBudgetCreate(BaseModel):
    category: str
    monthly_limit: float
    yearly_limit: float | None = None
    alert_threshold: int = 80
    year: int

class CategoryBudgetUpdate(BaseModel):
    monthly_limit: float | None = None
    yearly_limit: float | None = None
    alert_threshold: int | None = None
    is_active: bool | None = None

class RevenueCreate(BaseModel):
    month: int
    year: int
    amount: float
    source: str
    notes: str | None = None

# ------------------- HELPER -------------------

def get_user_company(user_id: int, db: Session):
    """Get company settings for user"""
    company = db.query(CompanySettings).filter(
        CompanySettings.user_id == user_id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company settings not found")
    return company

# ------------------- BUDGET ENDPOINTS -------------------

@router.post("/")
async def create_budget(
    user: user_dependency,
    db: db_dependency,
    budget_data: CategoryBudgetCreate
):
    """Create category budget"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    # Check if budget already exists for this category/year
    existing = db.query(CategoryBudget).filter(
        CategoryBudget.company_id == company.id,
        CategoryBudget.category == budget_data.category,
        CategoryBudget.year == budget_data.year
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Budget for {budget_data.category} in {budget_data.year} already exists"
        )
    
    budget = CategoryBudget(
        company_id=company.id,
        category=budget_data.category,
        monthly_limit=budget_data.monthly_limit,
        yearly_limit=budget_data.yearly_limit,
        alert_threshold=budget_data.alert_threshold,
        year=budget_data.year
    )
    
    db.add(budget)
    db.commit()
    db.refresh(budget)
    
    return {
        "message": "Budget created successfully",
        "budget": budget
    }

@router.post("/bulk")
async def create_budgets_bulk(
    user: user_dependency,
    db: db_dependency,
    budgets: List[CategoryBudgetCreate]
):
    """Create multiple budgets at once (for onboarding)"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    created_budgets = []
    for budget_data in budgets:
        # Check if exists
        existing = db.query(CategoryBudget).filter(
            CategoryBudget.company_id == company.id,
            CategoryBudget.category == budget_data.category,
            CategoryBudget.year == budget_data.year
        ).first()
        
        if existing:
            continue  # Skip duplicates
        
        budget = CategoryBudget(
            company_id=company.id,
            category=budget_data.category,
            monthly_limit=budget_data.monthly_limit,
            yearly_limit=budget_data.yearly_limit,
            alert_threshold=budget_data.alert_threshold,
            year=budget_data.year
        )
        db.add(budget)
        created_budgets.append(budget)
    
    db.commit()
    
    return {
        "message": f"Created {len(created_budgets)} budgets",
        "budgets": created_budgets
    }

@router.get("/")
async def list_budgets(
    user: user_dependency,
    db: db_dependency,
    year: int | None = None
):
    """List all budgets with spending data"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    query = db.query(CategoryBudget).filter(CategoryBudget.company_id == company.id)
    
    if year:
        query = query.filter(CategoryBudget.year == year)
    
    budgets = query.all()
    
    # Calculate spending for each budget
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    result = []
    for budget in budgets:
        # Get monthly spending
        monthly_spent = db.query(func.sum(Expense.amount)).filter(
            Expense.company_id == company.id,
            Expense.category == budget.category,
            func.extract('month', Expense.expense_date) == current_month,
            func.extract('year', Expense.expense_date) == current_year
        ).scalar() or 0
        
        # Get yearly spending
        yearly_spent = db.query(func.sum(Expense.amount)).filter(
            Expense.company_id == company.id,
            Expense.category == budget.category,
            func.extract('year', Expense.expense_date) == budget.year
        ).scalar() or 0
        
        result.append({
            **budget.__dict__,
            "monthly_spent": monthly_spent,
            "yearly_spent": yearly_spent,
            "monthly_remaining": budget.monthly_limit - monthly_spent,
            "yearly_remaining": (budget.yearly_limit or 0) - yearly_spent
        })
    
    return result

@router.put("/{budget_id}")
async def update_budget(
    user: user_dependency,
    db: db_dependency,
    updates: CategoryBudgetUpdate,
    budget_id: int = Path(gt=0)
):
    """Update budget"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    budget = db.query(CategoryBudget).filter(
        CategoryBudget.id == budget_id,
        CategoryBudget.company_id == company.id
    ).first()
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(budget, field, value)
    
    db.commit()
    db.refresh(budget)
    
    return {
        "message": "Budget updated successfully",
        "budget": budget
    }

@router.delete("/{budget_id}")
async def delete_budget(
    user: user_dependency,
    db: db_dependency,
    budget_id: int = Path(gt=0)
):
    """Delete budget"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    budget = db.query(CategoryBudget).filter(
        CategoryBudget.id == budget_id,
        CategoryBudget.company_id == company.id
    ).first()
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    db.delete(budget)
    db.commit()
    
    return {"message": "Budget deleted successfully"}

# ------------------- REVENUE ENDPOINTS -------------------

@router.post("/revenue/")
async def create_revenue(
    user: user_dependency,
    db: db_dependency,
    revenue_data: RevenueCreate
):
    """Create revenue entry"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    revenue = Revenue(
        company_id=company.id,
        month=revenue_data.month,
        year=revenue_data.year,
        amount=revenue_data.amount,
        source=revenue_data.source,
        notes=revenue_data.notes
    )
    
    db.add(revenue)
    db.commit()
    db.refresh(revenue)
    
    return {
        "message": "Revenue created successfully",
        "revenue": revenue
    }

@router.get("/revenue/")
async def list_revenue(
    user: user_dependency,
    db: db_dependency,
    year: int | None = None
):
    """List all revenue entries"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    query = db.query(Revenue).filter(Revenue.company_id == company.id)
    
    if year:
        query = query.filter(Revenue.year == year)
    
    revenues = query.order_by(Revenue.year.desc(), Revenue.month.desc()).all()
    
    return revenues

@router.get("/revenue/stats")
async def get_revenue_stats(user: user_dependency, db: db_dependency):
    """Get revenue statistics"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Current month revenue
    current = db.query(func.sum(Revenue.amount)).filter(
        Revenue.company_id == company.id,
        Revenue.month == current_month,
        Revenue.year == current_year
    ).scalar() or 0
    
    # This year total
    yearly = db.query(func.sum(Revenue.amount)).filter(
        Revenue.company_id == company.id,
        Revenue.year == current_year
    ).scalar() or 0
    
    # Average monthly
    avg_monthly = db.query(func.avg(Revenue.amount)).filter(
        Revenue.company_id == company.id
    ).scalar() or 0
    
    return {
        "current_month": current,
        "current_year": yearly,
        "average_monthly": avg_monthly
    }