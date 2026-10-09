"""Pre-validate the student bulk-import CSV before pasting into /students/import.

Row format: name,email,password,schoolName,currentYear,totalBudget (no header).
Mirrors CreateStudentSchema rules in src/lib/validations.ts.

Usage: .venv\\Scripts\\python.exe tools\\check_csv.py file.csv
"""

import csv
import re
import sys

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def check_row(i, cols):
    errors = []
    if len(cols) < 6:
        return [f"Row {i}: need 6 columns, got {len(cols)}"]
    name, email, password, school, year, budget = [c.strip() for c in cols[:6]]
    if len(name) < 2:
        errors.append("name min 2 chars")
    if not EMAIL_RE.match(email):
        errors.append("invalid email")
    if len(password) < 8:
        errors.append("password min 8 chars")
    if len(school) < 2:
        errors.append("school min 2 chars")
    try:
        y = int(year)
        if not 1 <= y <= 10:
            errors.append("year must be 1-10")
    except ValueError:
        errors.append("year must be an integer")
    try:
        if float(budget) <= 0:
            errors.append("budget must be positive")
    except ValueError:
        errors.append("budget must be a number")
    return [f"Row {i}: " + "; ".join(errors)] if errors else []


def main(path):
    bad = 0
    with open(path, newline="", encoding="utf-8") as f:
        for i, cols in enumerate(csv.reader(f), start=1):
            if not cols or all(not c.strip() for c in cols):
                continue
            for e in check_row(i, cols):
                print(e)
                bad += 1
    print(f"{'FAIL' if bad else 'OK'}: {bad} problem(s)")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python tools/check_csv.py file.csv")
    main(sys.argv[1])
