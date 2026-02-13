from typing import Annotated, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel
from datetime import datetime

from models import Employee, Users, CompanySettings, Payroll
from database import SessionLocal
from routers.auth import get_current_user

router = APIRouter(
    prefix="/employees",
    tags=["employees"]
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

class EmployeeCreate(BaseModel):
    user_id: int | None = None
    employee_id: str
    designation: str
    department: str
    employment_type: str = 'full-time'
    date_of_joining: str
    base_salary: float
    currency: str = 'USD'
    bank_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None

class EmployeeUpdate(BaseModel):
    designation: str | None = None
    department: str | None = None
    employment_type: str | None = None
    base_salary: float | None = None
    bank_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    is_active: bool | None = None

# ------------------- HELPER -------------------

def get_user_company(user_id: int, db: Session):
    """Get company settings for user"""
    company = db.query(CompanySettings).filter(
        CompanySettings.user_id == user_id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company settings not found. Complete onboarding first.")
    return company

# ------------------- ENDPOINTS -------------------

@router.post("/")
async def create_employee(
    user: user_dependency,
    db: db_dependency,
    employee_data: EmployeeCreate
):
    """Create a new employee"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    # Check if employee_id already exists
    existing = db.query(Employee).filter(
        Employee.employee_id == employee_data.employee_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    # Parse date
    try:
        doj = datetime.fromisoformat(employee_data.date_of_joining.replace('Z', '+00:00'))
    except:
        doj = datetime.strptime(employee_data.date_of_joining, '%Y-%m-%d')
    
    employee = Employee(
        user_id=employee_data.user_id,
        company_id=company.id,
        employee_id=employee_data.employee_id,
        designation=employee_data.designation,
        department=employee_data.department,
        employment_type=employee_data.employment_type,
        date_of_joining=doj,
        base_salary=employee_data.base_salary,
        currency=employee_data.currency,
        bank_name=employee_data.bank_name,
        account_number=employee_data.account_number,
        ifsc_code=employee_data.ifsc_code,
        is_active=True
    )
    
    db.add(employee)
    db.commit()
    db.refresh(employee)
    
    # Update company employee count
    company.num_employees = db.query(Employee).filter(
        Employee.company_id == company.id,
        Employee.is_active == True
    ).count()
    db.commit()
    
    return {
        "message": "Employee created successfully",
        "employee": employee
    }

@router.get("/")
async def list_employees(user: user_dependency, db: db_dependency):
    """List all employees in company"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    employees = db.query(Employee).filter(
        Employee.company_id == company.id
    ).all()
    
    return employees

@router.get("/{employee_id}")
async def get_employee(
    user: user_dependency,
    db: db_dependency,
    employee_id: int = Path(gt=0)
):
    """Get employee details with user data"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == company.id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get user data if exists
    user_data = None
    if employee.user_id:
        user_obj = db.query(Users).filter(Users.id == employee.user_id).first()
        if user_obj:
            user_data = {
                "id": user_obj.id,
                "email": user_obj.email,
                "first_name": user_obj.first_name,
                "last_name": user_obj.last_name,
                "phone_number": user_obj.phone_number
            }
    
    return {
        **employee.__dict__,
        "user": user_data
    }

@router.put("/{employee_id}")
async def update_employee(
    user: user_dependency,
    db: db_dependency,
    updates: EmployeeUpdate,
    employee_id: int = Path(gt=0)
):
    """Update employee details"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == company.id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update fields
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(employee, field, value)
    
    employee.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(employee)
    
    return {
        "message": "Employee updated successfully",
        "employee": employee
    }

@router.delete("/{employee_id}")
async def deactivate_employee(
    user: user_dependency,
    db: db_dependency,
    employee_id: int = Path(gt=0)
):
    """Deactivate employee (soft delete)"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == company.id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee.is_active = False
    employee.updated_at = datetime.utcnow()
    db.commit()
    
    # Update company employee count
    company.num_employees = db.query(Employee).filter(
        Employee.company_id == company.id,
        Employee.is_active == True
    ).count()
    db.commit()
    
    return {"message": "Employee deactivated successfully"}

@router.get("/{employee_id}/payroll")
async def get_employee_payroll(
    user: user_dependency,
    db: db_dependency,
    employee_id: int = Path(gt=0)
):
    """Get payroll history for employee"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == company.id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    payrolls = db.query(Payroll).filter(
        Payroll.employee_id == employee_id
    ).order_by(Payroll.year.desc(), Payroll.month.desc()).all()
    
    return payrolls

@router.get("/stats/overview")
async def get_employee_stats(user: user_dependency, db: db_dependency):
    """Get employee statistics overview"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    total_employees = db.query(Employee).filter(
        Employee.company_id == company.id,
        Employee.is_active == True
    ).count()
    
    # Department breakdown
    dept_counts = db.query(
        Employee.department,
        func.count(Employee.id).label('count')
    ).filter(
        Employee.company_id == company.id,
        Employee.is_active == True
    ).group_by(Employee.department).all()
    
    departments = {dept: count for dept, count in dept_counts}
    
    # Total salary burden
    total_salary = db.query(
        func.sum(Employee.base_salary)
    ).filter(
        Employee.company_id == company.id,
        Employee.is_active == True
    ).scalar() or 0
    
    return {
        "total_employees": total_employees,
        "departments": departments,
        "total_monthly_salary": total_salary
    }