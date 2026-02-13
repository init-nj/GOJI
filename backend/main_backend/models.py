from database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, DateTime, Date, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum


# ================= USER MODEL =================

class Users(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")  # user, admin, hr, finance
    phone_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    employee_profile = relationship("Employee", back_populates="user", uselist=False)
    expenses_created = relationship("Expense", back_populates="created_by_user", foreign_keys="Expense.created_by")


# ================= EMPLOYEE MODEL =================

class Employee(Base):
    """
    Employee details for payroll management.
    Extends Users table with employment-specific info.
    """
    __tablename__ = 'employees'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    employee_id = Column(String, unique=True, index=True)  # e.g., EMP001
    
    # Personal details
    date_of_birth = Column(Date, nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact = Column(String, nullable=True)
    
    # Employment details
    designation = Column(String)  # e.g., "Software Engineer", "Marketing Manager"
    department = Column(String)  # e.g., "Engineering", "Marketing"
    date_of_joining = Column(Date)
    employment_type = Column(String, default="full_time")  # full_time, part_time, contract
    
    # Salary details
    base_salary = Column(Float)  # Monthly base salary
    currency = Column(String, default="USD")
    
    # Bank details
    bank_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    ifsc_code = Column(String, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    termination_date = Column(Date, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("Users", back_populates="employee_profile")
    payroll_records = relationship("Payroll", back_populates="employee")
    leave_records = relationship("LeaveRecord", back_populates="employee")


# ================= PAYROLL MODEL =================

class Payroll(Base):
    """
    Monthly payroll records for each employee.
    Tracks salary, bonuses, deductions, overtime, etc.
    """
    __tablename__ = 'payroll'
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'))
    
    # Period
    month = Column(Integer)  # 1-12
    year = Column(Integer)
    pay_period_start = Column(Date)
    pay_period_end = Column(Date)
    
    # Earnings
    base_salary = Column(Float)
    overtime_hours = Column(Float, default=0.0)
    overtime_pay = Column(Float, default=0.0)
    bonus = Column(Float, default=0.0)
    allowances = Column(Float, default=0.0)  # Travel, food, etc.
    
    # Deductions
    tax_deduction = Column(Float, default=0.0)
    insurance_deduction = Column(Float, default=0.0)
    provident_fund = Column(Float, default=0.0)
    loan_deduction = Column(Float, default=0.0)
    other_deductions = Column(Float, default=0.0)
    
    # Leave adjustments
    paid_leaves = Column(Integer, default=0)
    unpaid_leaves = Column(Integer, default=0)
    leave_deduction = Column(Float, default=0.0)
    
    # Totals
    gross_salary = Column(Float)  # Before deductions
    net_salary = Column(Float)    # After deductions
    
    # Status
    status = Column(String, default="draft")  # draft, processed, paid
    payment_date = Column(Date, nullable=True)
    payment_method = Column(String, nullable=True)  # bank_transfer, cash, check
    
    # Notes
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Relationships
    employee = relationship("Employee", back_populates="payroll_records")


# ================= EXPENSE MODEL =================

class ExpenseCategory(str, enum.Enum):
    """Predefined expense categories"""
    SALARY = "salary"
    RENT = "rent"
    UTILITIES = "utilities"
    MARKETING = "marketing"
    SOFTWARE = "software"
    OFFICE_SUPPLIES = "office_supplies"
    TRAVEL = "travel"
    FOOD = "food"
    EQUIPMENT = "equipment"
    INSURANCE = "insurance"
    LEGAL = "legal"
    TRAINING = "training"
    MISCELLANEOUS = "miscellaneous"


class Expense(Base):
    """
    Track all company expenses.
    AI will categorize and analyze spending patterns.
    """
    __tablename__ = 'expenses'
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic details
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    amount = Column(Float)
    currency = Column(String, default="USD")
    
    # Category
    category = Column(String, index=True)  # Will use AI to auto-categorize
    subcategory = Column(String, nullable=True)
    
    # Vendor/Payment details
    vendor_name = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)  # credit_card, bank_transfer, cash
    transaction_id = Column(String, nullable=True)
    
    # Date
    expense_date = Column(Date, index=True)
    
    # Status
    status = Column(String, default="pending")  # pending, approved, rejected, paid
    is_recurring = Column(Boolean, default=False)
    recurrence_period = Column(String, nullable=True)  # monthly, quarterly, yearly
    
    # AI flags
    is_anomaly = Column(Boolean, default=False)  # Flagged by AI as unusual
    ai_confidence = Column(Float, nullable=True)  # AI categorization confidence
    ai_category_suggestion = Column(String, nullable=True)
    
    # Attachments
    receipt_url = Column(String, nullable=True)
    
    # Audit
    created_by = Column(Integer, ForeignKey('users.id'))
    approved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by_user = relationship("Users", foreign_keys=[created_by], back_populates="expenses_created")


# ================= BUDGET MODEL =================

class Budget(Base):
    """
    Budget limits for different expense categories.
    Used for alerts and monitoring.
    """
    __tablename__ = 'budgets'
    
    id = Column(Integer, primary_key=True, index=True)
    
    category = Column(String, index=True)
    monthly_limit = Column(Float)
    quarterly_limit = Column(Float, nullable=True)
    yearly_limit = Column(Float, nullable=True)
    
    # Period
    year = Column(Integer)
    month = Column(Integer, nullable=True)  # Null if yearly budget
    
    # Alerts
    alert_threshold = Column(Float, default=80.0)  # Alert at 80% of budget
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ================= LEAVE RECORDS =================

class LeaveRecord(Base):
    """
    Track employee leave for payroll calculations.
    """
    __tablename__ = 'leave_records'
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'))
    
    leave_type = Column(String)  # sick, casual, paid, unpaid
    start_date = Column(Date)
    end_date = Column(Date)
    days_count = Column(Integer)
    
    reason = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending, approved, rejected
    
    approved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", back_populates="leave_records")


# ================= FINANCIAL PREDICTIONS =================

class FinancialPrediction(Base):
    """
    Store AI predictions for cash flow, burn rate, etc.
    """
    __tablename__ = 'financial_predictions'
    
    id = Column(Integer, primary_key=True, index=True)
    
    prediction_type = Column(String)  # cash_flow, burn_rate, runway
    prediction_month = Column(Integer)
    prediction_year = Column(Integer)
    
    predicted_value = Column(Float)
    confidence_score = Column(Float)
    
    # Actual vs predicted (filled later)
    actual_value = Column(Float, nullable=True)
    
    model_version = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ================= COMPANY SETTINGS =================

class CompanySettings(Base):
    """
    Global settings for the company/startup.
    """
    __tablename__ = 'company_settings'
    
    id = Column(Integer, primary_key=True, index=True)
    
    company_name = Column(String)
    currency = Column(String, default="USD")
    financial_year_start = Column(Integer, default=1)  # Month (1-12)
    
    # Payroll settings
    default_working_days = Column(Integer, default=22)
    overtime_multiplier = Column(Float, default=1.5)
    
    # Leave settings
    annual_paid_leaves = Column(Integer, default=20)
    sick_leave_allowed = Column(Integer, default=10)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ================= ALERTS/NOTIFICATIONS =================

class Alert(Base):
    """
    System alerts for budget limits, unusual expenses, etc.
    """
    __tablename__ = 'alerts'
    
    id = Column(Integer, primary_key=True, index=True)
    
    alert_type = Column(String)  # budget_exceeded, anomaly_detected, payroll_due
    severity = Column(String)  # info, warning, critical
    
    title = Column(String)
    message = Column(Text)
    
    related_entity_type = Column(String, nullable=True)  # expense, payroll, budget
    related_entity_id = Column(Integer, nullable=True)
    
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)