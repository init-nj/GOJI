from typing import Annotated
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Path
from starlette import status

from models import Users
from database import SessionLocal
from routers.auth import get_current_user

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
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


# Admin check
def verify_admin(user: dict):
    if user is None or user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )


#Get all users
@router.get("/users", status_code=status.HTTP_200_OK)
async def get_all_users(user: user_dependency, db: db_dependency):
    verify_admin(user)
    return db.query(Users).all()


# Get user by ID
@router.get("/users/{user_id}", status_code=status.HTTP_200_OK)
async def get_user_by_id(
    user: user_dependency,
    db: db_dependency,
    user_id: int = Path(gt=0)
):
    verify_admin(user)

    user_model = db.query(Users).filter(Users.id == user_id).first()

    if not user_model:
        raise HTTPException(status_code=404, detail="User not found")

    return user_model


#Delete user
@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user: user_dependency,
    db: db_dependency,
    user_id: int = Path(gt=0)
):
    verify_admin(user)

    user_model = db.query(Users).filter(Users.id == user_id).first()

    if not user_model:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user_model)
    db.commit()


# Promote user to admin
@router.put("/users/{user_id}/promote", status_code=status.HTTP_204_NO_CONTENT)
async def promote_user(
    user: user_dependency,
    db: db_dependency,
    user_id: int = Path(gt=0)
):
    verify_admin(user)

    user_model = db.query(Users).filter(Users.id == user_id).first()

    if not user_model:
        raise HTTPException(status_code=404, detail="User not found")

    user_model.role = "admin"
    db.add(user_model)
    db.commit()
