from typing import Annotated
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime
from io import BytesIO

from models import Payroll, Employee, CompanySettings
from database import SessionLocal
from routers.auth import get_current_user

router = APIRouter(
    prefix="/payroll",
    tags=["payroll"]
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

class PayrollCreate(BaseModel):
    employee_id: int
    month: int
    year: int
    overtime_hours: float = 0
    bonus: float = 0
    allowances: float = 0
    tax: float = 0
    insurance: float = 0
    provident_fund: float = 0
    loan_repayment: float = 0
    other_deductions: float = 0
    paid_leaves_taken: int = 0
    unpaid_leaves_taken: int = 0

# ------------------- HELPER -------------------

def get_user_company(user_id: int, db: Session):
    """Get company settings for user"""
    company = db.query(CompanySettings).filter(
        CompanySettings.user_id == user_id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company settings not found")
    return company

def calculate_payroll(employee: Employee, company: CompanySettings, data: PayrollCreate) -> dict:
    """Calculate payroll components"""
    base_salary = employee.base_salary
    working_days = company.default_working_days
    
    # Calculate overtime
    overtime_rate = (base_salary / working_days) / 8 * 1.5  # 1.5x hourly rate
    overtime_amount = overtime_rate * data.overtime_hours
    
    # Calculate leave deduction
    leave_deduction = 0
    if data.unpaid_leaves_taken > 0:
        per_day_salary = base_salary / working_days
        leave_deduction = per_day_salary * data.unpaid_leaves_taken
    
    # Gross salary
    gross_salary = base_salary + overtime_amount + data.bonus + data.allowances
    
    # Total deductions
    total_deductions = (
        data.tax +
        data.insurance +
        data.provident_fund +
        data.loan_repayment +
        data.other_deductions +
        leave_deduction
    )
    
    # Net salary
    net_salary = gross_salary - total_deductions
    
    return {
        "base_salary": base_salary,
        "overtime_amount": round(overtime_amount, 2),
        "leave_deduction": round(leave_deduction, 2),
        "gross_salary": round(gross_salary, 2),
        "total_deductions": round(total_deductions, 2),
        "net_salary": round(net_salary, 2)
    }

def generate_salary_slip_text(payroll: Payroll, employee: Employee, company: CompanySettings) -> str:
    """Generate text-based salary slip"""
    slip = f"""
{'='*60}
                        SALARY SLIP
{'='*60}

Company: {company.company_name}
Employee: {employee.user.first_name} {employee.user.last_name} ({employee.employee_id})
Designation: {employee.designation}
Department: {employee.department}

Period: {payroll.month}/{payroll.year}
Payment Date: {datetime.now().strftime('%Y-%m-%d')}

{'='*60}
EARNINGS:
{'='*60}
Base Salary:                  ${payroll.base_salary:>12,.2f}
Overtime ({payroll.overtime_hours} hrs):       ${payroll.overtime_amount:>12,.2f}
Bonus:                        ${payroll.bonus:>12,.2f}
Allowances:                   ${payroll.allowances:>12,.2f}
                              {'─'*30}
Gross Salary:                 ${payroll.gross_salary:>12,.2f}

{'='*60}
DEDUCTIONS:
{'='*60}
Tax:                          ${payroll.tax:>12,.2f}
Insurance:                    ${payroll.insurance:>12,.2f}
Provident Fund:               ${payroll.provident_fund:>12,.2f}
Loan Repayment:               ${payroll.loan_repayment:>12,.2f}
Other Deductions:             ${payroll.other_deductions:>12,.2f}
Leave Deduction:              ${payroll.leave_deduction:>12,.2f}
                              {'─'*30}
Total Deductions:             ${payroll.total_deductions:>12,.2f}

{'='*60}
NET SALARY:                   ${payroll.net_salary:>12,.2f}
{'='*60}

Leave Summary:
Paid Leaves: {payroll.paid_leaves_taken}
Unpaid Leaves: {payroll.unpaid_leaves_taken}

This is a computer-generated salary slip.
"""
    return slip

# ------------------- ENDPOINTS -------------------

@router.post("/")
async def create_payroll(
    user: user_dependency,
    db: db_dependency,
    payroll_data: PayrollCreate
):
    """Create payroll with auto-calculations"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    # Get employee
    employee = db.query(Employee).filter(
        Employee.id == payroll_data.employee_id,
        Employee.company_id == company.id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if payroll already exists for this month/year
    existing = db.query(Payroll).filter(
        Payroll.employee_id == payroll_data.employee_id,
        Payroll.month == payroll_data.month,
        Payroll.year == payroll_data.year
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Payroll for {payroll_data.month}/{payroll_data.year} already exists"
        )
    
    # Calculate payroll
    calculations = calculate_payroll(employee, company, payroll_data)
    
    payroll = Payroll(
        employee_id=payroll_data.employee_id,
        company_id=company.id,
        month=payroll_data.month,
        year=payroll_data.year,
        base_salary=calculations['base_salary'],
        overtime_hours=payroll_data.overtime_hours,
        overtime_amount=calculations['overtime_amount'],
        bonus=payroll_data.bonus,
        allowances=payroll_data.allowances,
        gross_salary=calculations['gross_salary'],
        tax=payroll_data.tax,
        insurance=payroll_data.insurance,
        provident_fund=payroll_data.provident_fund,
        loan_repayment=payroll_data.loan_repayment,
        other_deductions=payroll_data.other_deductions,
        total_deductions=calculations['total_deductions'],
        paid_leaves_taken=payroll_data.paid_leaves_taken,
        unpaid_leaves_taken=payroll_data.unpaid_leaves_taken,
        leave_deduction=calculations['leave_deduction'],
        net_salary=calculations['net_salary'],
        status='draft',
        processed_by=user.get("id"),
        processed_at=datetime.utcnow()
    )
    
    db.add(payroll)
    db.commit()
    db.refresh(payroll)
    
    return {
        "message": "Payroll created successfully",
        "payroll": payroll
    }

@router.get("/")
async def list_payroll(
    user: user_dependency,
    db: db_dependency,
    month: int | None = None,
    year: int | None = None,
    employee_id: int | None = None
):
    """List all payroll records"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    query = db.query(Payroll).filter(Payroll.company_id == company.id)
    
    if month:
        query = query.filter(Payroll.month == month)
    if year:
        query = query.filter(Payroll.year == year)
    if employee_id:
        query = query.filter(Payroll.employee_id == employee_id)
    
    payrolls = query.order_by(Payroll.year.desc(), Payroll.month.desc()).all()
    
    # Add employee details
    result = []
    for payroll in payrolls:
        employee = db.query(Employee).filter(Employee.id == payroll.employee_id).first()
        payroll_dict = payroll.__dict__.copy()
        payroll_dict['employee_name'] = f"{employee.user.first_name} {employee.user.last_name}"
        payroll_dict['employee_id_str'] = employee.employee_id
        payroll_dict['designation'] = employee.designation
        result.append(payroll_dict)
    
    return result

@router.get("/{payroll_id}")
async def get_payroll(
    user: user_dependency,
    db: db_dependency,
    payroll_id: int = Path(gt=0)
):
    """Get payroll details"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    payroll = db.query(Payroll).filter(
        Payroll.id == payroll_id,
        Payroll.company_id == company.id
    ).first()
    
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")
    
    return payroll

@router.get("/{payroll_id}/salary-slip")
async def download_salary_slip(
    user: user_dependency,
    db: db_dependency,
    payroll_id: int = Path(gt=0)
):
    """Download salary slip as text file"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    payroll = db.query(Payroll).filter(
        Payroll.id == payroll_id,
        Payroll.company_id == company.id
    ).first()
    
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")
    
    employee = db.query(Employee).filter(Employee.id == payroll.employee_id).first()
    
    # Generate salary slip
    slip_text = generate_salary_slip_text(payroll, employee, company)
    
    # Create file
    buffer = BytesIO(slip_text.encode('utf-8'))
    filename = f"salary_slip_{employee.employee_id}_{payroll.month}_{payroll.year}.txt"
    
    return StreamingResponse(
        buffer,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.put("/{payroll_id}/status")
async def update_payroll_status(
    user: user_dependency,
    db: db_dependency,
    payroll_id: int,
    status: str
):
    """Update payroll status"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if status not in ['draft', 'processed', 'paid']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    company = get_user_company(user.get("id"), db)
    
    payroll = db.query(Payroll).filter(
        Payroll.id == payroll_id,
        Payroll.company_id == company.id
    ).first()
    
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")
    
    payroll.status = status
    payroll.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(payroll)
    
    return {
        "message": f"Payroll status updated to {status}",
        "payroll": payroll
    }

@router.delete("/{payroll_id}")
async def delete_payroll(
    user: user_dependency,
    db: db_dependency,
    payroll_id: int = Path(gt=0)
):
    """Delete payroll record"""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    company = get_user_company(user.get("id"), db)
    
    payroll = db.query(Payroll).filter(
        Payroll.id == payroll_id,
        Payroll.company_id == company.id
    ).first()
    
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")
    
    if payroll.status == 'paid':
        raise HTTPException(
            status_code=400,
            detail="Cannot delete paid payroll"
        )
    
    db.delete(payroll)
    db.commit()
    
    return {"message": "Payroll deleted successfully"}