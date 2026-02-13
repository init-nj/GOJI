from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
from models import Base
from routers import auth, admin, users

app = FastAPI()


# DATABASE
# Hackathon mode: auto-create tables
Base.metadata.create_all(bind=engine)


# middleware CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


#  ROUTERS 
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(users.router)


# HEALTH CHECK 
@app.get("/healthy")
def health():
    return {"status": "Healthy"}
