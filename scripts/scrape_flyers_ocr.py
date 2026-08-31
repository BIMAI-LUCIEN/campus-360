"""
Campus 360 — Script Autonome de Scraping & OCR Multimodal (Gemini 2.0/3.5 Flash)
Ce script extrait automatiquement les offres de stage à partir d'images de flyers / captures d'écran
et les insère directement dans la base de données Supabase.
"""

import os
import json
import base64
import requests

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

def parse_job_flyer(image_path: str) -> dict:
    """Analyse un flyer de recrutement avec l'IA Gemini Multimodal et extrait les données structurées."""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image introuvable : {image_path}")

    with open(image_path, "rb") as img_file:
        image_b64 = base64.b64encode(img_file.read()).decode("utf-8")

    prompt = """
    Tu es un assistant RH expert en analyse d'annonces de recrutement en Afrique Francophone.
    Analyse cette image d'offre de stage ou d'emploi et extrait les données en JSON strict avec la structure suivante :
    {
      "company_name": "Nom de l'entreprise ou 'Entreprise Confidentielle'",
      "title": "Intitulé du poste de stage (ex: Stagiaire Comptable)",
      "description": "Description résumée des missions",
      "requirements": ["Compétence 1", "Compétence 2", "Compétence 3"],
      "location": "Ville ou pays (ex: Abidjan, Côte d'Ivoire)",
      "duration": "Durée (ex: 3 mois, 6 mois)",
      "stipend": "Rémunération / Indemnité si mentionnée ou null",
      "contact_email": "Adresse email de recrutement ou null",
      "contact_whatsapp": "Numéro de téléphone WhatsApp au format international ou null",
      "apply_method": "WHATSAPP" si un numéro est mentionné, "EMAIL" si un email est mentionné, sinon "IN_APP"
    }
    Réponds UNIQUEMENT avec le JSON valide, sans texte d'introduction ni balises markdown.
    """

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_b64
                        }
                    }
                ]
            }
        ]
    }

    response = requests.post(GEMINI_ENDPOINT, json=payload)
    response.raise_for_status()
    res_data = response.json()
    raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
    
    # Nettoyage JSON
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]

    return json.loads(raw_text.strip())

def insert_job_to_supabase(job_data: dict, flyer_url: str):
    """Enregistre l'offre extraite dans la base de données PostgreSQL Supabase."""
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    # 1. Créer ou récupérer l'entreprise
    company_payload = {
        "name": job_data.get("company_name", "Entreprise Partenaire"),
        "contact_whatsapp": job_data.get("contact_whatsapp"),
        "contact_email": job_data.get("contact_email"),
        "status": "UNVERIFIED"
    }

    comp_res = requests.post(f"{SUPABASE_URL}/rest/v1/stage_companies", headers=headers, json=company_payload)
    comp_id = comp_res.json()[0]["id"] if comp_res.status_code == 201 else None

    # 2. Insérer le job
    job_payload = {
        "company_id": comp_id,
        "title": job_data.get("title", "Offre de Stage"),
        "description": job_data.get("description", ""),
        "requirements": job_data.get("requirements", []),
        "apply_method": job_data.get("apply_method", "IN_APP"),
        "location": job_data.get("location", "Abidjan"),
        "duration": job_data.get("duration", "3 mois"),
        "stipend": job_data.get("stipend"),
        "flyer_url": flyer_url,
        "is_sponsored": False,
        "source": "EXTERNAL_SCRAPED"
    }

    job_res = requests.post(f"{SUPABASE_URL}/rest/v1/stage_jobs", headers=headers, json=job_payload)
    return job_res.json()

if __name__ == "__main__":
    print("🤖 Campus 360 — OCR Multimodal de flyers initialisé.")
