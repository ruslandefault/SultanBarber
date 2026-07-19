"""SQLAlchemy models. Importing this package registers every table on Base.metadata."""

from app.db.base import Base
from app.models.appointment import Appointment, AppointmentService
from app.models.client import Client, ClientTag, ClientTagLink
from app.models.master import Master, MasterService
from app.models.media import Media
from app.models.notification import SentReminder
from app.models.payment import Payment
from app.models.product import Product
from app.models.salon import Salon, SalonSettings, WorkingHours
from app.models.service import Service, ServiceCategory
from app.models.user import User

__all__ = [
    "Base",
    "Salon",
    "SalonSettings",
    "WorkingHours",
    "User",
    "Master",
    "MasterService",
    "ServiceCategory",
    "Service",
    "Client",
    "ClientTag",
    "ClientTagLink",
    "Appointment",
    "AppointmentService",
    "Payment",
    "Product",
    "Media",
    "SentReminder",
]
