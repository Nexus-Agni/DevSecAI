import os
import psycopg2
import json

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password123@db:5432/devsecaianalyst")
if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

def get_connection():
    return psycopg2.connect(DATABASE_URL)

def get_report_status(report_id: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT status FROM "AnalysisReport" WHERE id = %s', (report_id,))
            result = cur.fetchone()
            return result[0] if result else None
    finally:
        conn.close()

def update_report_status(report_id: str, status: str, error_message: str = None):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            if error_message:
                cur.execute(
                    'UPDATE "AnalysisReport" SET status = %s, "errorMessage" = %s, "updatedAt" = NOW() WHERE id = %s',
                    (status, error_message, report_id)
                )
            else:
                cur.execute(
                    'UPDATE "AnalysisReport" SET status = %s, "updatedAt" = NOW() WHERE id = %s',
                    (status, report_id)
                )
        conn.commit()
    finally:
        conn.close()

def save_report(report_id, risk_score, critical, high, medium, low, sast, secrets, deps, network, summary):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                '''
                UPDATE "AnalysisReport" 
                SET status = 'COMPLETED',
                    "riskScore" = %s,
                    "criticalCount" = %s,
                    "highCount" = %s,
                    "mediumCount" = %s,
                    "lowCount" = %s,
                    "findingsSast" = %s,
                    "findingsSecrets" = %s,
                    "findingsDependencies" = %s,
                    "findingsNetwork" = %s,
                    summary = %s,
                    "updatedAt" = NOW()
                WHERE id = %s
                ''',
                (
                    risk_score, critical, high, medium, low,
                    json.dumps(sast), json.dumps(secrets), json.dumps(deps), json.dumps(network), json.dumps(summary),
                    report_id
                )
            )
        conn.commit()
    finally:
        conn.close()
