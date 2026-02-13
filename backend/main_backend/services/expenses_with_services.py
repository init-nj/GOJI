from typing import Annotated
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from fastapi import APIRouter, Depends, HTTPException, Path, UploadFile, File, Query
from pydantic import BaseModel
from datetime import datetime, timedelta
from pathlib import Path as FilePath

from models import Expense, CompanySettings, CategoryBudget
from database import SessionLocal
from routers.auth import get_current_user

# Import services
import sys
sys.path.append('..')
from services.ocr_service import extract_receipt_data
from services.ml_service import categorize_expense, detect_anomaly

router = APIRouter(
    prefix="/expenses",
    tags=["expenses"]
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

class ExpenseCreate(BaseModel):
    title: str
    description: str | None = None
    amount: float
    currency: str = 'USD'
    category: str | None = None
    vendor_name: str | None = None
    payment_method: str | None = None
    expense_date: str

class ExpenseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    amount: float | None = None
    category: str | None = None
    vendor_name: str | None = None
    payment_method: str | None = None
    expense_date: str | None = None
    status: str | None = None

# ------------------- HELPER -------------------

def get_user_company(user_id: int, db: Session):
    """Get company settings for user"""
    company = db.query(CompanySettings).filter(
        CompanySettings.user_id == user_id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company settings not found")
    return company

def get_category_history(company_id: int, category: str, db: Session) -> list:
    """Get historical expense amounts for a category"""
    expenses = db.query(Expense.amount).filter(
        Expense.company_id == company_id,
        Expense.category == category
    ).all()
    return [e.amount for e in expenses]

# ------------------- ENDPOINTS -------------------

@router.post("/ocr")
async def extract_receipt_data_endpoint(
    user: user_dependency,
    db: db_dependency,
    file: UploadFile = File(...)
):
    """Extract data from receipt using OCR"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Validate file type
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.pdf')):
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPG, PNG, or PDF")
    
    # Save file
    upload_dir = FilePath("uploads/receipts")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{timestamp}_{file.filename}"
    filepath = upload_dir / filename
    
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Use OCR service to extract data
    try:
        ocr_data = extract_receipt_data(str(filepath))
        
        return {
            "success": True,
            "receipt_url": f"/uploads/receipts/{filename}",
            "extracted_data": ocr_data
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "receipt_url": f"/uploads/receipts/{filename}"
        }

@router.post("/")
async def create_expense(
    user: user_dependency,
    db: db_dependency,
    expense_data: ExpenseCreate
):
    """Create expense with AI categorization and anomaly detection"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    # Parse date
    try:
        exp_date = datetime.fromisoformat(expense_data.expense_date.replace('Z', '+00:00'))
    except:
        exp_date = datetime.strptime(expense_data.expense_date, '%Y-%m-%d')
    
    # AI categorization if category not provided
    ai_category = None
    ai_confidence = None
    
    if not expense_data.category:
        # Use ML service for categorization
        ai_category, ai_confidence = categorize_expense(
            title=expense_data.title,
            description=expense_data.description or "",
            vendor=expense_data.vendor_name or "",
            amount=expense_data.amount
        )
        expense_data.category = ai_category
    
    # Get historical data for anomaly detection
    historical_data = get_category_history(company.id, expense_data.category, db)
    
    # Get budget limit for this category
    budget = db.query(CategoryBudget).filter(
        CategoryBudget.company_id == company.id,
        CategoryBudget.category == expense_data.category,
        CategoryBudget.year == datetime.now().year
    ).first()
    
    budget_limit = budget.monthly_limit if budget else None
    
    # Use ML service for anomaly detection
    is_anomaly, anomaly_reason = detect_anomaly(
        amount=expense_data.amount,
        category=expense_data.category,
        historical_data=historical_data,
        budget_limit=budget_limit
    )
    
    expense = Expense(
        company_id=company.id,
        created_by=user.get("id"),
        title=expense_data.title,
        description=expense_data.description,
        amount=expense_data.amount,
        currency=expense_data.currency,
        category=expense_data.category,
        vendor_name=expense_data.vendor_name,
        payment_method=expense_data.payment_method,
        expense_date=exp_date,
        ai_category=ai_category,
        ai_confidence=ai_confidence,
        is_anomaly=is_anomaly,
        anomaly_reason=anomaly_reason,
        status='pending'
    )
    
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    return {
        "message": "Expense created successfully",
        "expense": expense,
        "ai_categorized": ai_category is not None,
        "flagged_anomaly": is_anomaly
    }

@router.get("/")
async def list_expenses(
    user: user_dependency,
    db: db_dependency,
    category: str | None = None,
    status: str | None = None,
    month: int | None = None,
    year: int | None = None,
    skip: int = 0,
    limit: int = 100
):
    """List expenses with filters"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    query = db.query(Expense).filter(Expense.company_id == company.id)
    
    if category:
        query = query.filter(Expense.category == category)
    if status:
        query = query.filter(Expense.status == status)
    if month and year:
        query = query.filter(
            extract('month', Expense.expense_date) == month,
            extract('year', Expense.expense_date) == year
        )
    
    expenses = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit).all()
    
    return expenses

@router.get("/{expense_id}")
async def get_expense(
    user: user_dependency,
    db: db_dependency,
    expense_id: int = Path(gt=0)
):
    """Get expense details"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.company_id == company.id
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return expense

@router.put("/{expense_id}")
async def update_expense(
    user: user_dependency,
    db: db_dependency,
    updates: ExpenseUpdate,
    expense_id: int = Path(gt=0)
):
    """Update expense"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.company_id == company.id
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    for field, value in updates.dict(exclude_unset=True).items():
        if field == 'expense_date' and value:
            value = datetime.fromisoformat(value.replace('Z', '+00:00'))
        setattr(expense, field, value)
    
    expense.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(expense)
    
    return {
        "message": "Expense updated successfully",
        "expense": expense
    }

@router.delete("/{expense_id}")
async def delete_expense(
    user: user_dependency,
    db: db_dependency,
    expense_id: int = Path(gt=0)
):
    """Delete expense"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.company_id == company.id
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    db.delete(expense)
    db.commit()
    
    return {"message": "Expense deleted successfully"}

@router.put("/{expense_id}/approve")
async def approve_expense(
    user: user_dependency,
    db: db_dependency,
    expense_id: int = Path(gt=0)
):
    """Approve expense"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.company_id == company.id
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense.status = 'approved'
    expense.approved_by = user.get("id")
    expense.approved_at = datetime.utcnow()
    expense.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(expense)
    
    return {
        "message": "Expense approved successfully",
        "expense": expense
    }

@router.get("/stats/summary")
async def get_expense_summary(user: user_dependency, db: db_dependency):
    """Get expense summary stats"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Total this month
    monthly_total = db.query(func.sum(Expense.amount)).filter(
        Expense.company_id == company.id,
        extract('month', Expense.expense_date) == current_month,
        extract('year', Expense.expense_date) == current_year
    ).scalar() or 0
    
    # Pending approvals
    pending = db.query(func.count(Expense.id)).filter(
        Expense.company_id == company.id,
        Expense.status == 'pending'
    ).scalar() or 0
    
    # Anomalies
    anomalies = db.query(func.count(Expense.id)).filter(
        Expense.company_id == company.id,
        Expense.is_anomaly == True
    ).scalar() or 0
    
    return {
        "monthly_total": monthly_total,
        "pending_approvals": pending,
        "anomalies_detected": anomalies
    }

@router.get("/analytics/trends")
async def get_expense_trends(
    user: user_dependency,
    db: db_dependency,
    months: int = Query(default=6, ge=1, le=12)
):
    """Get expense trends over time"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    # Get monthly totals for last N months
    trends = []
    for i in range(months):
        target_date = datetime.now() - timedelta(days=30 * i)
        month = target_date.month
        year = target_date.year
        
        total = db.query(func.sum(Expense.amount)).filter(
            Expense.company_id == company.id,
            extract('month', Expense.expense_date) == month,
            extract('year', Expense.expense_date) == year
        ).scalar() or 0
        
        trends.append({
            "month": month,
            "year": year,
            "total": total
        })
    
    return trends[::-1]  # Reverse to get chronological order