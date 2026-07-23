import os
import redis
import json
import time
from db import update_report_status, save_report
from agent import analysis_graph

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
LIST_NAME = "devsec:scraped_jobs"

def main():
    print(f"Engine starting, connecting to Redis at {REDIS_URL}")
    r = redis.from_url(REDIS_URL)
    
    print(f"Listening on Redis list: {LIST_NAME}")
    while True:
        try:
            # Block until a job is available (timeout=5)
            # Returns a tuple (list_name, item) or None on timeout
            result = r.brpop(LIST_NAME, timeout=5)
            if not result:
                continue
                
            _, item = result
            job_data = json.loads(item.decode('utf-8'))
            
            report_id = job_data.get('reportId')
            files = job_data.get('files', [])
            
            if not report_id:
                print("Received job without reportId, skipping.")
                continue
                
            print(f"Processing report {report_id} with {len(files)} files.")
            from logger import log_to_redis
            from db import get_report_status
            
            if get_report_status(report_id) == 'FAILED':
                print(f"Report {report_id} is cancelled/failed. Skipping.")
                continue

            log_to_redis(report_id, "INFO", f"Engine picked up job. Processing {len(files)} files.")
            
            # 1. Update status
            update_report_status(report_id, 'ANALYZING')
            
            # 2. Run LangGraph
            initial_state = {
                "report_id": report_id,
                "files": files,
                "dependency_list": [],
                "cve_report": [],
                "secrets_report": [],
                "sast_report": [],
                "network_report": [],
                "risk_score": 0,
                "summary": {}
            }
            
            try:
                log_to_redis(report_id, "INFO", "Invoking LangGraph AI agents pipeline...")
                final_state = analysis_graph.invoke(initial_state)
                
                # 3. Save results
                if get_report_status(report_id) == 'FAILED':
                    log_to_redis(report_id, "WARN", "Analysis was cancelled. Discarding results.")
                    print(f"Report {report_id} was cancelled during analysis.")
                else:
                    log_to_redis(report_id, "INFO", "AI pipeline complete. Saving results to database.")
                    save_report(
                        report_id=report_id,
                        risk_score=final_state.get('risk_score', 0),
                        critical=final_state.get('summary', {}).get('critical', 0),
                        high=final_state.get('summary', {}).get('high', 0),
                        medium=final_state.get('summary', {}).get('medium', 0),
                        low=final_state.get('summary', {}).get('low', 0),
                        sast=final_state.get('sast_report', []),
                        secrets=final_state.get('secrets_report', []),
                        deps=final_state.get('cve_report', []),
                        network=final_state.get('network_report', []),
                        summary=final_state.get('summary', {})
                    )
                    print(f"Successfully finished report {report_id}")
                    log_to_redis(report_id, "INFO", "Analysis completed and saved successfully.")
                
            except Exception as e:
                print(f"Error analyzing report {report_id}: {str(e)}")
                log_to_redis(report_id, "ERROR", f"AI Engine pipeline failed: {str(e)}")
                update_report_status(report_id, 'FAILED', str(e))
                
        except Exception as e:
            print(f"Queue processor error: {str(e)}")
            time.sleep(2) # Prevent tight loop on Redis connection failure

if __name__ == "__main__":
    main()
