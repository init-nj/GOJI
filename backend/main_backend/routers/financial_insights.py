from typing import Annotated
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timedelta
import statistics

from models import Expense, Revenue, CompanySettings, CategoryBudget, Employee, Payroll
from database import SessionLocal
from routers.auth import get_current_user

router = APIRouter(
    prefix="/financial-insights",
    tags=["financial-insights"]
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

# ------------------- HELPER -------------------

def get_user_company(user_id: int, db: Session):
    """Get company settings for user"""
    company = db.query(CompanySettings).filter(
        CompanySettings.user_id == user_id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company settings not found")
    return company

def get_monthly_expenses(company_id: int, months: int, db: Session) -> list:
    """Get monthly expense totals for last N months"""
    results = []
    for i in range(months):
        target_date = datetime.now() - timedelta(days=30 * i)
        month = target_date.month
        year = target_date.year
        
        total = db.query(func.sum(Expense.amount)).filter(
            Expense.company_id == company_id,
            extract('month', Expense.expense_date) == month,
            extract('year', Expense.expense_date) == year
        ).scalar() or 0
        
        results.append(total)
    
    return results[::-1]  # Chronological order

def get_monthly_revenue(company_id: int, months: int, db: Session) -> list:
    """Get monthly revenue for last N months"""
    results = []
    for i in range(months):
        target_date = datetime.now() - timedelta(days=30 * i)
        month = target_date.month
        year = target_date.year
        
        total = db.query(func.sum(Revenue.amount)).filter(
            Revenue.company_id == company_id,
            Revenue.month == month,
            Revenue.year == year
        ).scalar() or 0
        
        results.append(total)
    
    return results[::-1]  # Chronological order

# ------------------- ENDPOINTS -------------------

@router.get("/dashboard")
async def get_dashboard_insights(user: user_dependency, db: db_dependency):
    """Get comprehensive dashboard insights"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Monthly expenses
    monthly_expenses = db.query(func.sum(Expense.amount)).filter(
        Expense.company_id == company.id,
        extract('month', Expense.expense_date) == current_month,
        extract('year', Expense.expense_date) == current_year
    ).scalar() or 0
    
    # Monthly revenue
    monthly_revenue = db.query(func.sum(Revenue.amount)).filter(
        Revenue.company_id == company.id,
        Revenue.month == current_month,
        Revenue.year == current_year
    ).scalar() or 0
    
    # Total employees
    total_employees = db.query(func.count(Employee.id)).filter(
        Employee.company_id == company.id,
        Employee.is_active == True
    ).scalar() or 0
    
    # Monthly payroll
    monthly_payroll = db.query(func.sum(Payroll.net_salary)).filter(
        Payroll.company_id == company.id,
        Payroll.month == current_month,
        Payroll.year == current_year
    ).scalar() or 0
    
    # Pending expenses
    pending = db.query(func.count(Expense.id)).filter(
        Expense.company_id == company.id,
        Expense.status == 'pending'
    ).scalar() or 0
    
    return {
        "monthly_expenses": monthly_expenses,
        "monthly_revenue": monthly_revenue,
        "monthly_payroll": monthly_payroll,
        "total_employees": total_employees,
        "pending_approvals": pending,
        "net_cash_flow": monthly_revenue - monthly_expenses - monthly_payroll
    }

@router.get("/health-score")
async def calculate_health_score(user: user_dependency, db: db_dependency):
    """Calculate financial health score (0-10)"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    score = 10.0
    factors = []
    
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Factor 1: Budget adherence (30%)
    if company.monthly_budget_limit:
        monthly_expenses = db.query(func.sum(Expense.amount)).filter(
            Expense.company_id == company.id,
            extract('month', Expense.expense_date) == current_month,
            extract('year', Expense.expense_date) == current_year
        ).scalar() or 0
        
        budget_usage = (monthly_expenses / company.monthly_budget_limit) * 100
        
        if budget_usage > 100:
            score -= 3.0
            factors.append({
                "factor": "Budget Overrun",
                "impact": -3.0,
                "details": f"{budget_usage:.1f}% of budget used"
            })
        elif budget_usage > 90:
            score -= 1.5
            factors.append({
                "factor": "Near Budget Limit",
                "impact": -1.5,
                "details": f"{budget_usage:.1f}% of budget used"
            })
    
    # Factor 2: Cash flow (30%)
    monthly_revenue = db.query(func.sum(Revenue.amount)).filter(
        Revenue.company_id == company.id,
        Revenue.month == current_month,
        Revenue.year == current_year
    ).scalar() or 0
    
    monthly_expenses = db.query(func.sum(Expense.amount)).filter(
        Expense.company_id == company.id,
        extract('month', Expense.expense_date) == current_month,
        extract('year', Expense.expense_date) == current_year
    ).scalar() or 0
    
    cash_flow = monthly_revenue - monthly_expenses
    
    if cash_flow < 0:
        score -= 3.0
        factors.append({
            "factor": "Negative Cash Flow",
            "impact": -3.0,
            "details": f"${abs(cash_flow):,.2f} deficit"
        })
    elif monthly_revenue > 0 and cash_flow / monthly_revenue < 0.1:
        score -= 1.5
        factors.append({
            "factor": "Low Profit Margin",
            "impact": -1.5,
            "details": f"{(cash_flow/monthly_revenue)*100:.1f}% margin"
        })
    
    # Factor 3: Anomalies (20%)
    anomalies = db.query(func.count(Expense.id)).filter(
        Expense.company_id == company.id,
        Expense.is_anomaly == True,
        extract('month', Expense.expense_date) == current_month,
        extract('year', Expense.expense_date) == current_year
    ).scalar() or 0
    
    if anomalies > 5:
        score -= 2.0
        factors.append({
            "factor": "High Anomalies",
            "impact": -2.0,
            "details": f"{anomalies} unusual expenses"
        })
    elif anomalies > 2:
        score -= 1.0
        factors.append({
            "factor": "Some Anomalies",
            "impact": -1.0,
            "details": f"{anomalies} unusual expenses"
        })
    
    # Factor 4: Pending approvals (10%)
    pending = db.query(func.count(Expense.id)).filter(
        Expense.company_id == company.id,
        Expense.status == 'pending'
    ).scalar() or 0
    
    if pending > 10:
        score -= 1.0
        factors.append({
            "factor": "Many Pending Approvals",
            "impact": -1.0,
            "details": f"{pending} expenses pending"
        })
    
    # Factor 5: Runway (10%)
    if company.total_budget and monthly_expenses > 0:
        runway_months = company.total_budget / monthly_expenses
        if runway_months < 3:
            score -= 1.0
            factors.append({
                "factor": "Low Runway",
                "impact": -1.0,
                "details": f"{runway_months:.1f} months remaining"
            })
    
    # Ensure score is between 0 and 10
    score = max(0, min(10, score))
    
    # Grade
    if score >= 8:
        grade = "Excellent"
        color = "green"
    elif score >= 6:
        grade = "Good"
        color = "blue"
    elif score >= 4:
        grade = "Fair"
        color = "yellow"
    else:
        grade = "Poor"
        color = "red"
    
    return {
        "score": round(score, 1),
        "grade": grade,
        "color": color,
        "factors": factors,
        "recommendations": generate_recommendations(factors)
    }

def generate_recommendations(factors: list) -> list:
    """Generate actionable recommendations"""
    recommendations = []
    
    for factor in factors:
        if "Budget Overrun" in factor['factor']:
            recommendations.append("Review and reduce non-essential expenses")
        elif "Negative Cash Flow" in factor['factor']:
            recommendations.append("Increase revenue or reduce operating costs")
        elif "Anomalies" in factor['factor']:
            recommendations.append("Investigate and approve/reject flagged expenses")
        elif "Pending Approvals" in factor['factor']:
            recommendations.append("Process pending expense approvals")
        elif "Low Runway" in factor['factor']:
            recommendations.append("Seek additional funding or reduce burn rate")
    
    if not recommendations:
        recommendations.append("Maintain current financial practices")
    
    return recommendations

@router.get("/predict-cash-flow")
async def predict_cash_flow(
    user: user_dependency,
    db: db_dependency,
    months_ahead: int = Query(default=3, ge=1, le=6)
):
    """Predict cash flow for next N months using simple linear regression"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    # Get historical data (last 6 months)
    expenses = get_monthly_expenses(company.id, 6, db)
    revenues = get_monthly_revenue(company.id, 6, db)
    
    # Simple prediction: average of last 3 months
    if len(expenses) >= 3:
        avg_expense = statistics.mean(expenses[-3:])
    else:
        avg_expense = statistics.mean(expenses) if expenses else 0
    
    if len(revenues) >= 3:
        avg_revenue = statistics.mean(revenues[-3:])
    else:
        avg_revenue = statistics.mean(revenues) if revenues else 0
    
    # Calculate trend
    if len(expenses) >= 3:
        expense_trend = (expenses[-1] - expenses[-3]) / 3
    else:
        expense_trend = 0
    
    if len(revenues) >= 3:
        revenue_trend = (revenues[-1] - revenues[-3]) / 3
    else:
        revenue_trend = 0
    
    # Generate predictions
    predictions = []
    for i in range(1, months_ahead + 1):
        predicted_expense = avg_expense + (expense_trend * i)
        predicted_revenue = avg_revenue + (revenue_trend * i)
        predicted_cash_flow = predicted_revenue - predicted_expense
        
        target_date = datetime.now() + timedelta(days=30 * i)
        
        predictions.append({
            "month": target_date.month,
            "year": target_date.year,
            "predicted_expense": round(predicted_expense, 2),
            "predicted_revenue": round(predicted_revenue, 2),
            "predicted_cash_flow": round(predicted_cash_flow, 2)
        })
    
    # Calculate burn rate and runway
    burn_rate = avg_expense
    runway_months = (company.total_budget / burn_rate) if company.total_budget and burn_rate > 0 else None
    
    return {
        "predictions": predictions,
        "burn_rate": round(burn_rate, 2),
        "runway_months": round(runway_months, 1) if runway_months else None,
        "confidence": "medium"  # Simple model has medium confidence
    }

@router.get("/spending-patterns")
async def analyze_spending_patterns(
    user: user_dependency,
    db: db_dependency,
    months: int = Query(default=6, ge=1, le=12)
):
    """Analyze spending patterns by category"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    # Get category breakdown for last N months
    cutoff_date = datetime.now() - timedelta(days=30 * months)
    
    category_totals = db.query(
        Expense.category,
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count'),
        func.avg(Expense.amount).label('average')
    ).filter(
        Expense.company_id == company.id,
        Expense.expense_date >= cutoff_date
    ).group_by(Expense.category).all()
    
    # Calculate total for percentages
    grand_total = sum(cat.total for cat in category_totals)
    
    patterns = []
    for cat in category_totals:
        percentage = (cat.total / grand_total * 100) if grand_total > 0 else 0
        
        # Get trend (compare last month to previous months)
        last_month = datetime.now().month
        last_year = datetime.now().year
        
        last_month_total = db.query(func.sum(Expense.amount)).filter(
            Expense.company_id == company.id,
            Expense.category == cat.category,
            extract('month', Expense.expense_date) == last_month,
            extract('year', Expense.expense_date) == last_year
        ).scalar() or 0
        
        avg_previous = (cat.total - last_month_total) / (months - 1) if months > 1 else cat.total
        
        trend = "increasing" if last_month_total > avg_previous * 1.2 else "stable"
        if last_month_total < avg_previous * 0.8:
            trend = "decreasing"
        
        patterns.append({
            "category": cat.category,
            "total_spent": round(cat.total, 2),
            "percentage": round(percentage, 1),
            "transaction_count": cat.count,
            "average_amount": round(cat.average, 2),
            "trend": trend
        })
    
    # Sort by total spent
    patterns.sort(key=lambda x: x['total_spent'], reverse=True)
    
    return {
        "patterns": patterns,
        "total_analyzed": round(grand_total, 2),
        "period_months": months
    }