from app.schemas.auth import LoginRequest, TokenResponse, UserInfo
from app.schemas.employee import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.schemas.declaration import DeclarationCreate, DeclarationRead, DeclarationUpdate
from app.schemas.dependent import DependentCreate, DependentRead, DependentUpdate
from app.schemas.insurance import InsuranceCreate, InsuranceRead, InsuranceUpdate
from app.schemas.housing import HousingCreate, HousingRead, HousingUpdate
from app.schemas.result import ResultRead

__all__ = [
    "LoginRequest", "TokenResponse", "UserInfo",
    "EmployeeCreate", "EmployeeRead", "EmployeeUpdate",
    "DeclarationCreate", "DeclarationRead", "DeclarationUpdate",
    "DependentCreate", "DependentRead", "DependentUpdate",
    "InsuranceCreate", "InsuranceRead", "InsuranceUpdate",
    "HousingCreate", "HousingRead", "HousingUpdate",
    "ResultRead",
]
