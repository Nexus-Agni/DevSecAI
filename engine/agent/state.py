from typing import TypedDict, List, Dict, Any

class AnalysisState(TypedDict):
    report_id: str
    repository_url: str
    files: List[Dict[str, str]]
    dependencies: List[Dict[str, Any]]
    cve_report: List[Dict[str, Any]]
    secrets_report: List[Dict[str, Any]]
    sast_report: List[Dict[str, Any]]
    network_report: List[Dict[str, Any]]
    risk_score: int
    summary: Dict[str, Any]
