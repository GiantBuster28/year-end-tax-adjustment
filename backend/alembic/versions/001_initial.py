"""Initial migration with all tables and sample data

Revision ID: 001
Revises:
Create Date: 2026-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from datetime import date, datetime
import bcrypt


revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # departments
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    # employees
    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("employee_code", sa.String(20), nullable=False),
        sa.Column("last_name", sa.String(50), nullable=False),
        sa.Column("first_name", sa.String(50), nullable=False),
        sa.Column("last_name_kana", sa.String(100), nullable=True),
        sa.Column("first_name_kana", sa.String(100), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("joined_date", sa.Date(), nullable=True),
        sa.Column("department_id", sa.Integer(), nullable=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("disability_type", sa.String(30), nullable=False, server_default="none"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("employee_code"),
        sa.UniqueConstraint("email"),
    )

    # tax_adjustment_declarations
    op.create_table(
        "tax_adjustment_declarations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("fiscal_year", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["approved_by"], ["employees.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # dependents
    op.create_table(
        "dependents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("declaration_id", sa.Integer(), nullable=False),
        sa.Column("relation_type", sa.String(30), nullable=False),
        sa.Column("last_name", sa.String(50), nullable=False),
        sa.Column("first_name", sa.String(50), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("annual_income", sa.Numeric(12, 0), nullable=False, server_default="0"),
        sa.Column("disability_type", sa.String(30), nullable=False, server_default="none"),
        sa.Column("disability_certificate_type", sa.String(100), nullable=True),
        sa.Column("disability_certificate_date", sa.Date(), nullable=True),
        sa.Column("disability_description", sa.Text(), nullable=True),
        sa.Column("is_living_together", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["declaration_id"], ["tax_adjustment_declarations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # insurance_deductions
    op.create_table(
        "insurance_deductions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("declaration_id", sa.Integer(), nullable=False),
        sa.Column("insurance_type", sa.String(20), nullable=False),
        sa.Column("insurance_company", sa.String(100), nullable=False),
        sa.Column("policy_name", sa.String(100), nullable=True),
        sa.Column("insured_person", sa.String(100), nullable=True),
        sa.Column("payment_amount", sa.Numeric(12, 0), nullable=False),
        sa.Column("deduction_amount", sa.Numeric(12, 0), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["declaration_id"], ["tax_adjustment_declarations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # housing_deductions
    op.create_table(
        "housing_deductions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("declaration_id", sa.Integer(), nullable=False),
        sa.Column("residence_start_date", sa.Date(), nullable=False),
        sa.Column("deduction_type", sa.String(50), nullable=False),
        sa.Column("loan_balance_1", sa.Numeric(14, 0), nullable=False, server_default="0"),
        sa.Column("loan_balance_2", sa.Numeric(14, 0), nullable=False, server_default="0"),
        sa.Column("deduction_amount", sa.Numeric(12, 0), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["declaration_id"], ["tax_adjustment_declarations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("declaration_id"),
    )

    # attachments
    op.create_table(
        "attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("declaration_id", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_type", sa.String(50), nullable=True),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["declaration_id"], ["tax_adjustment_declarations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # tax_adjustment_results
    op.create_table(
        "tax_adjustment_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("declaration_id", sa.Integer(), nullable=False),
        sa.Column("total_salary", sa.Numeric(14, 0), nullable=False),
        sa.Column("salary_income", sa.Numeric(14, 0), nullable=False),
        sa.Column("total_deductions", sa.Numeric(14, 0), nullable=False),
        sa.Column("taxable_income", sa.Numeric(14, 0), nullable=False),
        sa.Column("calculated_tax", sa.Numeric(12, 0), nullable=False),
        sa.Column("special_tax_credit", sa.Numeric(12, 0), nullable=False, server_default="0"),
        sa.Column("final_tax", sa.Numeric(12, 0), nullable=False),
        sa.Column("withheld_tax", sa.Numeric(12, 0), nullable=False),
        sa.Column("refund_or_collection", sa.Numeric(12, 0), nullable=False),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["declaration_id"], ["tax_adjustment_declarations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("declaration_id"),
    )

    # Insert sample data
    _insert_sample_data()


def _insert_sample_data():
    conn = op.get_bind()

    # Departments
    conn.execute(
        sa.text("""
            INSERT INTO departments (id, name, code) VALUES
            (1, '総務部', 'GEN'),
            (2, '経理部', 'ACC'),
            (3, '営業部', 'SAL'),
            (4, '開発部', 'DEV')
        """)
    )

    # Hash passwords
    def hash_pw(pw: str) -> str:
        return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

    admin_hash = hash_pw("password123")
    emp_hash = hash_pw("password123")

    conn.execute(
        sa.text("""
            INSERT INTO employees
                (id, employee_code, last_name, first_name, last_name_kana, first_name_kana,
                 birth_date, joined_date, department_id, email, password_hash,
                 is_active, is_admin, disability_type)
            VALUES
                (1, 'EMP001', '管理', '太郎', 'カンリ', 'タロウ',
                 '1975-04-01', '2000-04-01', 1, 'admin@example.com', :admin_hash,
                 true, true, 'none'),
                (2, 'EMP002', '山田', '花子', 'ヤマダ', 'ハナコ',
                 '1985-07-15', '2010-04-01', 2, 'yamada.hanako@example.com', :emp_hash,
                 true, false, 'none'),
                (3, 'EMP003', '鈴木', '一郎', 'スズキ', 'イチロウ',
                 '1990-03-20', '2015-04-01', 3, 'suzuki.ichiro@example.com', :emp_hash,
                 true, false, 'none'),
                (4, 'EMP004', '田中', '美咲', 'タナカ', 'ミサキ',
                 '1988-11-05', '2012-04-01', 4, 'tanaka.misaki@example.com', :emp_hash,
                 true, false, 'none'),
                (5, 'EMP005', '佐藤', '健太', 'サトウ', 'ケンタ',
                 '1995-08-22', '2020-04-01', 3, 'sato.kenta@example.com', :emp_hash,
                 true, false, 'none'),
                (6, 'EMP006', '伊藤', '恵子', 'イトウ', 'ケイコ',
                 '1980-01-30', '2005-04-01', 2, 'ito.keiko@example.com', :emp_hash,
                 true, false, 'none')
        """),
        {"admin_hash": admin_hash, "emp_hash": emp_hash},
    )

    # Sample declarations for fiscal year 2025
    conn.execute(
        sa.text("""
            INSERT INTO tax_adjustment_declarations
                (id, employee_id, fiscal_year, status, submitted_at)
            VALUES
                (1, 2, 2025, 'submitted', NOW()),
                (2, 3, 2025, 'draft', NULL),
                (3, 4, 2025, 'approved', NOW()),
                (4, 5, 2025, 'draft', NULL)
        """)
    )

    # Sample dependents
    conn.execute(
        sa.text("""
            INSERT INTO dependents
                (declaration_id, relation_type, last_name, first_name, birth_date,
                 annual_income, disability_type, is_living_together)
            VALUES
                (1, 'spouse', '山田', '次郎', '1983-05-10', 800000, 'none', true),
                (1, 'child', '山田', '咲', '2015-03-01', 0, 'none', true),
                (3, 'spouse', '田中', '誠', '1986-09-15', 500000, 'none', true)
        """)
    )

    # Reset sequences
    conn.execute(sa.text("SELECT setval('departments_id_seq', 10)"))
    conn.execute(sa.text("SELECT setval('employees_id_seq', 10)"))
    conn.execute(sa.text("SELECT setval('tax_adjustment_declarations_id_seq', 10)"))
    conn.execute(sa.text("SELECT setval('dependents_id_seq', 10)"))


def downgrade() -> None:
    op.drop_table("tax_adjustment_results")
    op.drop_table("attachments")
    op.drop_table("housing_deductions")
    op.drop_table("insurance_deductions")
    op.drop_table("dependents")
    op.drop_table("tax_adjustment_declarations")
    op.drop_table("employees")
    op.drop_table("departments")
