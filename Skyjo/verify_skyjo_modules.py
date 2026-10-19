#!/usr/bin/env python3
"""Verify SKYJO V19 using the maintained manifest-based integrity test."""
from pathlib import Path
import subprocess
import sys
test = Path(__file__).resolve().parents[1] / "tests" / "check_skyjo_modular.py"
sys.exit(subprocess.call([sys.executable, str(test)]))
