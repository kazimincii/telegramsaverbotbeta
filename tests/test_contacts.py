import sys
import pathlib
import pytest

# Add backend directory to path for module import
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "backend"))
from contacts import vc_escape

@pytest.mark.parametrize("input_value,expected", [
    ("back\\slash", "back\\\\slash"),
    ("semi;colon", "semi\\;colon"),
    ("com,ma", "com\\,ma"),
    ("line1\nline2", "line1\\nline2"),
    ("a\\b;c,d\ne", "a\\\\b\\;c\\,d\\ne"),
])
def test_vc_escape(input_value, expected):
    assert vc_escape(input_value) == expected
