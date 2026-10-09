"""Disbursed-vs-allocated report per school (read-only).

Usage: .venv\\Scripts\\python.exe tools\\utilization.py
"""

import pandas as pd

from db import get_engine

if __name__ == "__main__":
    engine = get_engine()
    students = pd.read_sql(
        'SELECT "schoolName" AS school, "totalBudget" AS allocated FROM "Student"',
        engine,
    )
    paid = pd.read_sql(
        """SELECT s."schoolName" AS school, SUM(p.amount) AS disbursed
           FROM "Payment" p JOIN "Student" s ON s.id = p."studentId"
           WHERE p.status = 'DISBURSED' GROUP BY s."schoolName" """,
        engine,
    )
    report = students.groupby("school", as_index=False)["allocated"].sum().merge(
        paid, on="school", how="left"
    )
    report["disbursed"] = report["disbursed"].fillna(0).astype(float)
    report["allocated"] = report["allocated"].astype(float)
    report["utilization_%"] = (
        report["disbursed"] / report["allocated"].replace(0, pd.NA) * 100
    ).round(1)
    print(report.to_string(index=False))
    print(
        f"\nTOTAL allocated={report['allocated'].sum():,.2f} "
        f"disbursed={report['disbursed'].sum():,.2f}"
    )
