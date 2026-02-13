from database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, DateTime, Date, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime


# ================= USER MODEL (Already exists - keeping as is) =================

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
    company = relationship("CompanySettings", back_populates="owner", uselist=False)


# ================= NEW MODELS FOR GOJI =================

class CompanySettings(Base):
    __tablename__ = 'company_settings'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    
    # Company Info
    company_name = Column(String)
    industry = Column(String, nullable=True)
    num_employees = Column(Integer, default=0)
    
    # Financial Config
    currency = Column(String, default='USD')
    financial_year_start = Column(Integer, default=1)  # Month 1-12
    default_working_days = Column(Integer, default=22)
    
    # Budget (for Goji)
    total_budget = Column(Float, nullable=True)
    monthly_budget_limit = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("Users", back_populates="company")
    employees = relationship("Employee", back_populates="company")
    expenses = relationship("Expense", back_populates="company")
    budgets = relationship("CategoryBudget", back_populates="company")
    revenues = relationship("Revenue", back_populates="company")
    payrolls = relationship("Payroll", back_populates="company")


class Employee(Base):
    __tablename__ = 'employees'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    company_id = Column(Integer, ForeignKey('company_settings.id'))
    
    # Employment Details
    employee_id = Column(String, unique=True, index=True)
    designation = Column(String)
    department = Column(String)
    employment_type = Column(String, default='full-time')
    date_of_joining = Column(DateTime)
    
    # Salary
    base_salary = Column(Float)
    currency = Column(String, default='USD')
    
    # Bank Details
    bank_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    ifsc_code = Column(String, nullable=True)
    
    # Personal Info
    date_of_birth = Column(DateTime, nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact = Column(String, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("Users", back_populates="employee_profile")
    company = relationship("CompanySettings", back_populates="employees")
    payrolls = relationship("Payroll", back_populates="employee")


class Expense(Base):
    __tablename__ = 'expenses'
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey('company_settings.id'))
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Expense Details
    title = Column(String)
    description = Column(Text, nullable=True)
    amount = Column(Float)
    currency = Column(String, default='USD')
    category = Column(String, nullable=True)
    vendor_name = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)
    expense_date = Column(DateTime)
    
    # Receipt & OCR
    receipt_url = Column(String, nullable=True)
    ocr_data = Column(JSON, nullable=True)
    
    # AI Features
    ai_category = Column(String, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    is_anomaly = Column(Boolean, default=False)
    anomaly_reason = Column(String, nullable=True)
    
    # Approval
    status = Column(String, default='pending')  # pending, approved, rejected
    approved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("CompanySettings", back_populates="expenses")
    created_by_user = relationship("Users", back_populates="expenses_created", foreign_keys=[created_by])


class CategoryBudget(Base):
    __tablename__ = 'category_budgets'
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey('company_settings.id'))
    
    category = Column(String)
    monthly_limit = Column(Float)
    yearly_limit = Column(Float, nullable=True)
    alert_threshold = Column(Integer, default=80)
    year = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company = relationship("CompanySettings", back_populates="budgets")


class Revenue(Base):
    __tablename__ = 'revenue'
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey('company_settings.id'))
    
    month = Column(Integer)
    year = Column(Integer)
    amount = Column(Float)
    source = Column(String)  # operations, funding, investment
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company = relationship("CompanySettings", back_populates="revenues")


class Payroll(Base):
    __tablename__ = 'payroll'
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'))
    company_id = Column(Integer, ForeignKey('company_settings.id'))
    
    # Period
    month = Column(Integer)
    year = Column(Integer)
    
    # Earnings
    base_salary = Column(Float)
    overtime_hours = Column(Float, default=0)
    overtime_amount = Column(Float, default=0)
    bonus = Column(Float, default=0)
    allowances = Column(Float, default=0)
    gross_salary = Column(Float)
    
    # Deductions
    tax = Column(Float, default=0)
    insurance = Column(Float, default=0)
    provident_fund = Column(Float, default=0)
    loan_repayment = Column(Float, default=0)
    other_deductions = Column(Float, default=0)
    total_deductions = Column(Float)
    
    # Leave
    paid_leaves_taken = Column(Integer, default=0)
    unpaid_leaves_taken = Column(Integer, default=0)
    leave_deduction = Column(Float, default=0)
    
    # Final
    net_salary = Column(Float)
    
    # Status
    status = Column(String, default='draft')  # draft, processed, paid
    processed_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    processed_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", back_populates="payrolls")
    company = relationship("CompanySettings", back_populates="payrolls")
