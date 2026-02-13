from typing import Annotated
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from fastapi import APIRouter, Depends, HTTPException, Path, UploadFile, File, Query
from pydantic import BaseModel
from datetime import datetime, timedelta
import re
import random
from pathlib import Path as FilePath

from models import Expense, CompanySettings, CategoryBudget
from database import SessionLocal
from routers.auth import get_current_user

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

# ------------------- AI CATEGORIZATION (Simplified) -------------------

CATEGORY_KEYWORDS = {
    'marketing': ['ad', 'marketing', 'campaign', 'social', 'facebook', 'google ads', 'seo', 'promotion'],
    'software': ['aws', 'software', 'saas', 'license', 'subscription', 'adobe', 'microsoft', 'slack', 'zoom'],
    'travel': ['flight', 'hotel', 'uber', 'lyft', 'airbnb', 'travel', 'taxi', 'rental'],
    'office': ['rent', 'office', 'utilities', 'electricity', 'internet', 'supplies', 'furniture'],
    'payroll': ['salary', 'wage', 'payroll', 'bonus', 'compensation'],
    'food': ['restaurant', 'food', 'meal', 'lunch', 'dinner', 'catering', 'snacks'],
    'equipment': ['computer', 'laptop', 'monitor', 'hardware', 'equipment', 'printer'],
    'legal': ['legal', 'lawyer', 'attorney', 'compliance', 'registration'],
    'other': []
}

def ai_categorize_expense(title: str, description: str = "", vendor: str = "") -> tuple[str, float]:
    """Simple AI categorization based on keywords"""
    text = f"{title} {description} {vendor}".lower()
    
    best_category = 'other'
    best_confidence = 0.0
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        matches = sum(1 for keyword in keywords if keyword in text)
        if matches > 0:
            confidence = min(matches * 0.3 + 0.4, 0.95)  # Cap at 95%
            if confidence > best_confidence:
                best_category = category
                best_confidence = confidence
    
    if best_confidence == 0:
        best_confidence = 0.3  # Low confidence for 'other'
    
    return best_category, round(best_confidence, 2)

def detect_anomaly(amount: float, category: str, company_id: int, db: Session) -> tuple[bool, str | None]:
    """Detect if expense is anomalous"""
    # Get average for this category
    avg = db.query(func.avg(Expense.amount)).filter(
        Expense.company_id == company_id,
        Expense.category == category
    ).scalar()
    
    if avg and amount > avg * 3:
        return True, f"Amount ${amount:.2f} is 3x higher than average ${avg:.2f} for {category}"
    
    # Check budget threshold
    budget = db.query(CategoryBudget).filter(
        CategoryBudget.company_id == company_id,
        CategoryBudget.category == category,
        CategoryBudget.year == datetime.now().year
    ).first()
    
    if budget and amount > budget.monthly_limit * 0.5:
        return True, f"Single expense is >50% of monthly budget (${budget.monthly_limit})"
    
    return False, None

# ------------------- OCR SIMULATION -------------------

def simulate_ocr(filename: str) -> dict:
    """Simulate OCR extraction (in production, use pytesseract)"""
    # Simulate extracted data based on filename
    vendor_match = re.search(r'(\w+)_receipt', filename.lower())
    vendor = vendor_match.group(1).title() if vendor_match else "Unknown Vendor"
    
    # Simulate random amounts and dates
    amount = round(random.uniform(50, 5000), 2)
    date = (datetime.now() - timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d')
    
    return {
        "vendor_name": vendor,
        "amount": amount,
        "date": date,
        "confidence": round(random.uniform(0.85, 0.98), 2),
        "raw_text": f"Receipt from {vendor}\nTotal: ${amount}\nDate: {date}"
    }

# ------------------- ENDPOINTS -------------------

@router.post("/ocr")
async def extract_receipt_data(
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
    
    # Simulate OCR (replace with actual OCR in production)
    ocr_data = simulate_ocr(file.filename)
    
    return {
        "success": True,
        "receipt_url": f"/uploads/receipts/{filename}",
        "extracted_data": ocr_data
    }

@router.post("/")
async def create_expense(
    user: user_dependency,
    db: db_dependency,
    expense_data: ExpenseCreate
):
    """Create expense with AI categorization"""
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
        ai_category, ai_confidence = ai_categorize_expense(
            expense_data.title,
            expense_data.description or "",
            expense_data.vendor_name or ""
        )
        expense_data.category = ai_category
    
    # Anomaly detection
    is_anomaly, anomaly_reason = detect_anomaly(
        expense_data.amount,
        expense_data.category,
        company.id,
        db
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
        "ai_categorized": ai_category is not None
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