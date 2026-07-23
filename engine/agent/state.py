from typing import TypedDict, List, Dict, Any

class AnalysisState(TypedDict):
    report_id: str
    files: List[Dict[str, str]]
    dependency_list: List[Dict[str, str]]
    cve_report: List[Dict[str, Any]]
    secrets_report: List[Dict[str, Any]]
    sast_report: List[Dict[str, Any]]
    network_report: List[Dict[str, Any]]
    risk_score: int
    summary: Dict[str, Any]
    collection_name: str
