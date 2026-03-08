# This file serves as the entry point for uvicorn
# The actual application code is in main.py with the modular structure
from main import app

# Re-export app for uvicorn
__all__ = ["app"]
