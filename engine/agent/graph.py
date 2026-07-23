import os
import json
import math
import uuid
import time
from typing import List, Dict, Any

from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from duckduckgo_search import DDGS
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from langgraph.prebuilt import create_react_agent
from langchain_community.tools.ddg_search import DuckDuckGoSearchRun
import httpx

from .state import AnalysisState
from logger import log_to_redis

# Ensure API keys are clean
api_key = os.environ.get("GEMINI_API_KEY", "").strip('"').strip("'")
os.environ["GEMINI_API_KEY"] = api_key

embedding_api_key = os.environ.get("GEMINI_API_KEY_EMBEDDING", "").strip('"').strip("'")
if embedding_api_key:
    os.environ["GEMINI_API_KEY_EMBEDDING"] = embedding_api_key
else:
    embedding_api_key = api_key

model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
llm = ChatGoogleGenerativeAI(model=model_name, temperature=0.1, google_api_key=api_key, max_retries=0)
fallback_llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", temperature=0.1, google_api_key=api_key, max_retries=0)
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2", google_api_key=embedding_api_key)

# Qdrant client
qdrant_host = os.environ.get("QDRANT_HOST", "qdrant")
qdrant_port = int(os.environ.get("QDRANT_PORT", "6333"))
client = QdrantClient(host=qdrant_host, port=qdrant_port)

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

def create_collection_if_not_exists(collection_name: str):
    if not client.collection_exists(collection_name=collection_name):
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=3072, distance=Distance.COSINE),
        )

def ingest_and_parse(state: AnalysisState):
    log_to_redis(state['report_id'], "INFO", f"Starting Ingest & Parse Node. Processing {len(state['files'])} files.")
    deps = []
    
    collection_name = f"repo_{state['report_id'].replace('-', '_')}"
    create_collection_if_not_exists(collection_name)
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    
    points = []
    
    for f in state['files']:
        # Extract dependencies
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
            
        # Chunk and embed
        try:
            chunks = text_splitter.split_text(f['content'])
            if not chunks: continue
            
            chunk_embeddings = embeddings.embed_documents(chunks)
            for i, chunk in enumerate(chunks):
                points.append(
                    PointStruct(
                        id=str(uuid.uuid4()),
                        vector=chunk_embeddings[i],
                        payload={"path": f['path'], "content": chunk}
                    )
                )
        except Exception as e:
            print(f"Error chunking {f['path']}: {e}")
            
    if points:
        # Batch upload
        batch_size = 50
        for i in range(0, len(points), batch_size):
            client.upsert(collection_name=collection_name, points=points[i:i+batch_size])
            
    log_to_redis(state['report_id'], "INFO", f"Ingested {len(points)} chunks into Qdrant. Found {len(deps)} dependencies.")
    return {"dependency_list": deps, "collection_name": collection_name}

def scan_cves(state: AnalysisState):
    log_to_redis(state['report_id'], "INFO", f"Starting CVE Scanner Node. Checking {len(state['dependency_list'])} dependencies via OSV.dev")
    cves = []
    
    for dep in state['dependency_list']:
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
    return {"cve_report": cves}

def scan_secrets(state: AnalysisState):
    log_to_redis(state['report_id'], "INFO", "Starting Agentic Secret Scanner Node...")
    collection_name = state.get("collection_name")
    if not collection_name: 
        log_to_redis(state['report_id'], "WARN", "No collection found for secrets scan.")
        return {"secrets_report": []}
    
    try:
        query_vector = embeddings.embed_query("password secret token api_key auth credentials")
        results = client.query_points(collection_name=collection_name, query=query_vector, limit=3).points
        
        if not results: 
            log_to_redis(state['report_id'], "INFO", "No potential secrets found in initial Qdrant query.")
            return {"secrets_report": []}
        
        log_to_redis(state['report_id'], "INFO", f"Found {len(results)} potential secret snippets. Invoking Secrets Agent...")
        context = "\n\n".join([f"File: {r.payload['path']}\nContent: {r.payload['content']}" for r in results])
        
        sys_msg = SystemMessage(content="You are an elite DevSecOps engineer. Analyze the code context for hardcoded secrets. Return ONLY valid JSON in this exact format: [{\"title\":\"Exposed Secret\",\"severity\":\"CRITICAL\",\"file\":\"filename.ext\",\"description\":\"Explanation\",\"compromiseVector\":\"How it can be exploited\"}]. If no secrets, return []. DO NOT wrap in markdown blocks, just raw JSON array.")
        
        res = invoke_with_retry(llm, [sys_msg, HumanMessage(content=f"Code Context:\n{context}")])
        
        output = res.content
        start = output.find("[")
        end = output.rfind("]")
        if start != -1 and end != -1:
            secrets = json.loads(output[start:end+1])
            log_to_redis(state['report_id'], "INFO", f"Secrets Engine extracted {len(secrets)} secrets.")
            return {"secrets_report": secrets}
        else:
            log_to_redis(state['report_id'], "WARN", f"Secrets Engine returned invalid JSON: {output}")
    except Exception as e:
        log_to_redis(state['report_id'], "ERROR", f"Error in secrets node: {e}")
        
    return {"secrets_report": []}

def scan_sast(state: AnalysisState):
    log_to_redis(state['report_id'], "INFO", "Starting Agentic SAST Scanner Node...")
    collection_name = state.get("collection_name")
    if not collection_name: 
        log_to_redis(state['report_id'], "WARN", "No collection found for SAST scan.")
        return {"sast_report": []}
    
    try:
        query_vector = embeddings.embed_query("SQL query execution express routes authentication file system access subprocess eval")
        results = client.query_points(collection_name=collection_name, query=query_vector, limit=4).points
        
        if not results: 
            log_to_redis(state['report_id'], "INFO", "No risky code patterns found in initial Qdrant query.")
            return {"sast_report": []}
        
        log_to_redis(state['report_id'], "INFO", f"Found {len(results)} risky code snippets. Invoking SAST Agent...")
        context = "\n\n".join([f"File: {r.payload['path']}\nContent: {r.payload['content']}" for r in results])
        
        sys_msg = SystemMessage(content="You are a senior offensive security researcher. Analyze this code context for OWASP vulnerabilities (e.g. SQLi, XSS, Auth Bypass). Return ONLY a valid JSON array of objects with keys: title, severity (CRITICAL, HIGH, MEDIUM, LOW), file, description (be precise), compromiseVector (how to exploit), remediation. If no vulnerabilities, return []. DO NOT wrap in markdown blocks, just raw JSON array.")
        
        res = invoke_with_retry(llm, [sys_msg, HumanMessage(content=f"Code Context:\n{context}")])
        
        output = res.content
        start = output.find("[")
        end = output.rfind("]")
        if start != -1 and end != -1:
            sast = json.loads(output[start:end+1])
            log_to_redis(state['report_id'], "INFO", f"SAST Engine extracted {len(sast)} vulnerabilities.")
            return {"sast_report": sast}
        else:
            log_to_redis(state['report_id'], "WARN", f"SAST Engine returned invalid JSON: {output}")
    except Exception as e:
        log_to_redis(state['report_id'], "ERROR", f"Error in SAST node: {e}")
        
    return {"sast_report": []}

def scan_network(state: AnalysisState):
    print(f"[{state['report_id']}] Node: scan_network")
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
    
    try:
        col_name = state.get("collection_name")
        if col_name and client.collection_exists(col_name):
            client.delete_collection(col_name)
    except: pass
    
    log_to_redis(state['report_id'], "INFO", f"Aggregation complete. Final risk score: {score}. Total findings: {total}")
    return {
        "risk_score": score,
        "summary": {
            "critical": crit, "high": high, "medium": med, "low": low, "total": total
        }
    }

workflow = StateGraph(AnalysisState)

workflow.add_node("ingest", ingest_and_parse)
workflow.add_node("cves", scan_cves)
workflow.add_node("secrets", scan_secrets)
workflow.add_node("sast", scan_sast)
workflow.add_node("network", scan_network)
workflow.add_node("aggregate", aggregate)

workflow.set_entry_point("ingest")
workflow.add_edge("ingest", "cves")
workflow.add_edge("cves", "secrets")
workflow.add_edge("secrets", "sast")
workflow.add_edge("sast", "network")
workflow.add_edge("network", "aggregate")
workflow.add_edge("aggregate", END)

analysis_graph = workflow.compile()
