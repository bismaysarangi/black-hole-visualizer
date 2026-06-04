from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./blackhole.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} 
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def init_db():
    from db.schema import Simulation, ShareToken  # import here to register models
    Base.metadata.create_all(bind=engine)        # this creates blackhole.db

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()