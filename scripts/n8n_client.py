#!/usr/bin/env python3
"""
Client CLI n8n pour la gestion automatisée des workflows sur https://n8n.blackcompany.site
"""
import sys
import os
import json
import urllib.request
import urllib.error

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

N8N_BASE_URL = os.environ.get("N8N_INSTANCE_URL", "https://n8n.blackcompany.site/api/v1")
N8N_API_KEY = os.environ.get(
    "N8N_API_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzN2Q3MTA2ZC1kYzMzLTRlZDEtYTA2OC1lYTliMWVmOTZkNWYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDkzNzI0MGMtZTkwNi00Yzk1LWFhZDItYTYxNTVmYzc5NzU1IiwiaWF0IjoxNzkwNjkxMTI5LCJleHAiOjE3OTMyNDY0MDB9.nGJcc0Cot7RpFlmTFQYb3I6zprXFb1K-PxfHIh3ZdC8"
)

def make_request(method, endpoint, data=None):
    url = f"{N8N_BASE_URL.rstrip('/')}/{endpoint.lstrip('/')}"
    headers = {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method.upper())
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"❌ Erreur HTTP {e.code}: {err_body}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}", file=sys.stderr)
        sys.exit(1)

def cmd_list():
    res = make_request("GET", "/workflows")
    workflows = res.get("data", res) if isinstance(res, dict) else res
    print(f"📋 Nombre de workflows trouvés : {len(workflows)}")
    for wf in workflows:
        active = "🟢 Active" if wf.get("active") else "🔴 Inactive"
        print(f"  - [{wf.get('id')}] {wf.get('name')} ({active})")

def cmd_get(wf_id):
    res = make_request("GET", f"/workflows/{wf_id}")
    print(json.dumps(res, indent=2, ensure_ascii=False))

def cmd_create(filepath):
    if not os.path.exists(filepath):
        print(f"❌ Fichier non trouvé : {filepath}", file=sys.stderr)
        sys.exit(1)
    with open(filepath, "r", encoding="utf-8") as f:
        wf_data = json.load(f)
    
    res = make_request("POST", "/workflows", wf_data)
    wf_id = res.get("id")
    print(f"✅ Workflow créé avec succès ! ID: {wf_id}")
    return wf_id

def cmd_update(wf_id, filepath):
    if not os.path.exists(filepath):
        print(f"❌ Fichier non trouvé : {filepath}", file=sys.stderr)
        sys.exit(1)
    with open(filepath, "r", encoding="utf-8") as f:
        wf_data = json.load(f)
    
    res = make_request("PUT", f"/workflows/{wf_id}", wf_data)
    print(f"✅ Workflow {wf_id} mis à jour avec succès !")

def cmd_activate(wf_id):
    res = make_request("POST", f"/workflows/{wf_id}/activate")
    print(f"⚡ Workflow {wf_id} activé en production !")

def cmd_deactivate(wf_id):
    res = make_request("POST", f"/workflows/{wf_id}/deactivate")
    print(f"⏸️ Workflow {wf_id} désactivé.")

def cmd_delete(wf_id):
    make_request("DELETE", f"/workflows/{wf_id}")
    print(f"🗑️ Workflow {wf_id} supprimé.")

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/n8n_client.py <list|get|create|update|activate|deactivate|delete> [args...]")
        sys.exit(1)
        
    cmd = sys.argv[1].lower()
    if cmd == "list":
        cmd_list()
    elif cmd == "get" and len(sys.argv) >= 3:
        cmd_get(sys.argv[2])
    elif cmd == "create" and len(sys.argv) >= 3:
        cmd_create(sys.argv[2])
    elif cmd == "update" and len(sys.argv) >= 4:
        cmd_update(sys.argv[2], sys.argv[3])
    elif cmd == "activate" and len(sys.argv) >= 3:
        cmd_activate(sys.argv[2])
    elif cmd == "deactivate" and len(sys.argv) >= 3:
        cmd_deactivate(sys.argv[2])
    elif cmd == "delete" and len(sys.argv) >= 3:
        cmd_delete(sys.argv[2])
    else:
        print(f"❌ Commande inconnue ou arguments manquants: {cmd}")
        sys.exit(1)

if __name__ == "__main__":
    main()
