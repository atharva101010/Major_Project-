
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.models.container import Container
print(f"Container class: {Container}")
print(f"Has parent_id? {hasattr(Container, 'parent_id')}")

try:
    from app.services.autoscaler_service import AutoScalerService
    print(f"AutoScalerService imported successfully")
except Exception as e:
    print(f"Failed to import AutoScalerService: {e}")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.session import engine

Session = sessionmaker(bind=engine)
db = Session()

try:
    count = db.query(Container).filter(Container.parent_id == 1).count()
    print(f"Query successful, count: {count}")
except Exception as e:
    print(f"Query failed: {e}")
finally:
    db.close()
