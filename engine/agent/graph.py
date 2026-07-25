import os
import json
import math
import time
from typing import List, Dict, Any

from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from duckduckgo_search import DDGS
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage
import httpx

from .state import AnalysisState
from logger import log_to_redis

# Ensure API keys are clean
api_key = os.environ.get("GEMINI_API_KEY", "").strip('"').strip("'")
os.environ["GEMINI_API_KEY"] = api_key

model_name = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
llm = ChatGoogleGenerativeAI(model=model_name, temperature=0.1, google_api_key=api_key, max_retries=0)
fallback_llm = ChatGoogleGenerativeAI(model="gemini-3.6-flash-lite", temperature=0.1, google_api_key=api_key, max_retries=0)

@tool
def search_tool(query: str) -> str:
    """A wrapper around DuckDuckGo Search. Useful for when you need to answer questions about current events. Input should be a search query."""
    try:
        results = DDGS().text(query, max_results=3)
        return "\n".join([r['body'] for r in results])
    except Exception as e:
        return f"Search failed: {e}"

tools = [search_tool]

def invoke_with_retry(llm_model, prompt, max_retries=2):
    for attempt in range(max_retries):
        try:
            return llm_model.invoke(prompt)
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                if attempt < max_retries - 1:
                    time.sleep(10)
                    continue
                else:
                    try:
                        return fallback_llm.invoke(prompt)
                    except:
                        pass
            raise e

def scan_cves(state: AnalysisState):
    log_to_redis(state['report_id'], "INFO", "Starting CVE Scanner Node.")
    deps = []
    
    # Extract dependencies directly from files
    for f in state['files']:
        if f['path'].endswith('package.json'):
            try:
                data = json.loads(f['content'])
                for pkg, ver in data.get('dependencies', {}).items():
                    deps.append({"name": pkg, "version": ver, "ecosystem": "npm"})
            except: pass
        elif f['path'].endswith('requirements.txt'):
            try:
                lines = f['content'].split('\n')
                for line in lines:
                    if '==' in line:
                        pkg, ver = line.split('==')
                        deps.append({"name": pkg.strip(), "version": ver.strip(), "ecosystem": "PyPI"})
            except: pass
            
    log_to_redis(state['report_id'], "INFO", f"Checking {len(deps)} dependencies via OSV.dev")
    cves = []
    
    for dep in deps:
        try:
            payload = {"version": dep["version"].strip("^~>="), "package": {"name": dep["name"], "ecosystem": dep["ecosystem"]}}
            resp = httpx.post("https://api.osv.dev/v1/query", json=payload, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                if "vulns" in data:
                    for vuln in data["vulns"]:
                        vuln_id = vuln.get("id", "Unknown")
                        details = vuln.get("details", "")
                        
                        cves.append({
                            "title": f"Vulnerable Dependency: {dep['name']}",
                            "severity": "HIGH", 
                            "file": "package.json", 
                            "description": f"{details[:500]}...",
                            "compromiseVector": "See OSV details.",
                            "package": dep['name'],
                            "version": dep['version'],
                            "vulnerabilityId": vuln_id,
                            "url": f"https://osv.dev/vulnerability/{vuln_id}"
                        })
                        break
        except Exception as e:
            log_to_redis(state['report_id'], "WARN", f"CVE query error for {dep['name']}: {e}")
            
    log_to_redis(state['report_id'], "INFO", f"CVE Scanner found {len(cves)} vulnerable dependencies.")
    return {"cve_report": cves, "dependencies": deps}

def scan_vulnerabilities(state: AnalysisState):
    log_to_redis(state['report_id'], "INFO", f"Starting Full-Context Vulnerability Scanner Node. Processing {len(state['files'])} files.")
    
    context = ""
    for f in state['files']:
        file_ctx = f"File: {f['path']}\nContent: {f['content']}\n\n"
        if len(context) + len(file_ctx) > 800000:
            log_to_redis(state['report_id'], "WARN", "Codebase is extremely large. Truncating context to ~800k characters for LLM safety.")
            break
        context += file_ctx

    if not context:
        log_to_redis(state['report_id'], "INFO", "No valid code files to scan.")
        return {"secrets_report": [], "sast_report": []}

    try:
        sys_msg = SystemMessage(content="You are an elite DevSecOps engineer and senior offensive security researcher. Analyze this complete codebase context for BOTH hardcoded secrets and OWASP vulnerabilities (e.g., SQLi, XSS, Auth Bypass). Return ONLY a valid JSON object with EXACTLY two keys: 'secrets' and 'sast'. Both keys must contain arrays of objects. For 'secrets', each object must have: title, severity (CRITICAL, HIGH), file, description, compromiseVector. For 'sast', each object must have: title, severity (CRITICAL, HIGH, MEDIUM, LOW), file, description (be precise), compromiseVector (how to exploit), remediation. If no vulnerabilities are found, return empty arrays. DO NOT wrap in markdown blocks, just raw JSON.")
        
        log_to_redis(state['report_id'], "INFO", "Invoking AI Agent with full codebase context...")
        res = invoke_with_retry(llm, [sys_msg, HumanMessage(content=f"Code Context:\n{context}")])
        
        output = res.content
        if isinstance(output, list):
            output = "".join([str(x.get('text', x)) if isinstance(x, dict) else str(x) for x in output])
        elif not isinstance(output, str):
            output = str(output)
            
        start = output.find("{")
        end = output.rfind("}")
        if start != -1 and end != -1:
            data = json.loads(output[start:end+1])
            secrets = data.get("secrets", [])
            sast = data.get("sast", [])
            log_to_redis(state['report_id'], "INFO", f"Vulnerability Scanner completed. Found {len(secrets)} secrets and {len(sast)} SAST findings.")
            return {"secrets_report": secrets, "sast_report": sast}
        else:
            log_to_redis(state['report_id'], "WARN", f"Vulnerability Scanner returned invalid JSON.")
    except Exception as e:
        log_to_redis(state['report_id'], "ERROR", f"Error in scan_vulnerabilities node: {e}")
        
    return {"secrets_report": [], "sast_report": []}

def scan_network(state: AnalysisState):
    log_to_redis(state['report_id'], "INFO", "Starting Network/IaC Scanner Node.")
    
    iac_files = [
        f for f in state.get('files', [])
        if f['path'].endswith('.tf') or f['path'].endswith('Dockerfile') or f['path'].endswith('docker-compose.yml') or f['path'].endswith('docker-compose.yaml')
    ]
    
    if not iac_files:
        log_to_redis(state['report_id'], "INFO", "No IaC files found for network scan.")
        return {"network_report": []}
        
    context = ""
    for f in iac_files:
        context += f"File: {f['path']}\nContent: {f['content']}\n\n"
        
    try:
        sys_msg = SystemMessage(content='You are an IaC security expert. Identify misconfigurations (e.g., open ports, root users, plaintext secrets in tf). Return exactly ONE raw JSON key: "network" containing an array of objects {title, severity (CRITICAL, HIGH, MEDIUM, LOW), file, description, compromiseVector, remediation}. DO NOT wrap in markdown blocks, just raw JSON.')
        
        log_to_redis(state['report_id'], "INFO", f"Scanning {len(iac_files)} IaC files for misconfigurations...")
        res = invoke_with_retry(llm, [sys_msg, HumanMessage(content=f"IaC Context:\n{context}")])
        
        output = res.content
        if isinstance(output, list):
            output = "".join([str(x.get('text', x)) if isinstance(x, dict) else str(x) for x in output])
        elif not isinstance(output, str):
            output = str(output)
            
        start = output.find("{")
        end = output.rfind("}")
        if start != -1 and end != -1:
            data = json.loads(output[start:end+1])
            network_findings = data.get("network", [])
            log_to_redis(state['report_id'], "INFO", f"Network Scanner completed. Found {len(network_findings)} issues.")
            return {"network_report": network_findings}
        else:
            log_to_redis(state['report_id'], "WARN", "Network Scanner returned invalid JSON.")
    except Exception as e:
        log_to_redis(state['report_id'], "ERROR", f"Error in scan_network node: {e}")
        
    return {"network_report": []}

def aggregate(state: AnalysisState):
    log_to_redis(state['report_id'], "INFO", "Starting Aggregator Node to compile final report...")
    sast = state.get('sast_report', [])
    secrets = state.get('secrets_report', [])
    cves = state.get('cve_report', [])
    network = state.get('network_report', [])
    
    total = len(sast) + len(secrets) + len(cves) + len(network)
    
    crit = sum(1 for x in sast + secrets + cves + network if x.get('severity', '').upper() == 'CRITICAL')
    high = sum(1 for x in sast + secrets + cves + network if x.get('severity', '').upper() == 'HIGH')
    med = sum(1 for x in sast + secrets + cves + network if x.get('severity', '').upper() == 'MEDIUM')
    low = sum(1 for x in sast + secrets + cves + network if x.get('severity', '').upper() == 'LOW')
    
    base = 0
    if crit > 0: base = 75
    elif high > 0: base = 50
    elif med > 0: base = 25
    elif low > 0: base = 10
    
    score = min(100, int(base + 15 * math.log10(1 + total))) if total > 0 else 0
    
    log_to_redis(state['report_id'], "INFO", f"Aggregation complete. Final risk score: {score}. Total findings: {total}")
    return {
        "risk_score": score,
        "summary": {
            "critical": crit, "high": high, "medium": med, "low": low, "total": total
        }
    }

workflow = StateGraph(AnalysisState)

workflow.add_node("cves", scan_cves)
workflow.add_node("vulns", scan_vulnerabilities)
workflow.add_node("network", scan_network)
workflow.add_node("aggregate", aggregate)

workflow.set_entry_point("cves")
workflow.add_edge("cves", "vulns")
workflow.add_edge("vulns", "network")
workflow.add_edge("network", "aggregate")
workflow.add_edge("aggregate", END)

analysis_graph = workflow.compile()
