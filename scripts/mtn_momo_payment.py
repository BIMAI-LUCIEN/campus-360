"""
Campus 360 — Microservice Python de Paiement Direct MTN Mobile Money (MoMo)
Permet de déclencher des demandes de paiement USSD Push directes sans passer par un agrégateur tiers.
"""

import os
import uuid
import requests

MOMO_API_BASE_URL = os.getenv("MOMO_API_BASE_URL", "https://sandbox.momodeveloper.mtn.com")
MOMO_API_USER = os.getenv("MOMO_API_USER", "")
MOMO_API_KEY = os.getenv("MOMO_API_KEY", "")
MOMO_PRIMARY_KEY = os.getenv("MOMO_PRIMARY_KEY", "")
MOMO_TARGET_ENV = os.getenv("MOMO_TARGET_ENV", "sandbox") # ou 'production'

def get_momo_auth_token() -> str:
    """Récupère le token d'autorisation OAuth 2.0 pour l'API MTN MoMo."""
    url = f"{MOMO_API_BASE_URL}/collection/token/"
    headers = {
        "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY
    }
    # Authentification basique HTTP (User:ApiKey)
    response = requests.post(url, headers=headers, auth=(MOMO_API_USER, MOMO_API_KEY))
    response.raise_for_status()
    return response.json().get("access_token")

def request_to_pay(phone_number: str, amount_fcfa: int, transaction_note: str = "Campus 360 Jetons") -> dict:
    """
    Déclenche une invite USSD Push sur le téléphone de l'étudiant ou du recruteur.
    L'utilisateur verra une pop-up sur son téléphone lui demandant de saisir son code secret PIN.
    """
    token = get_momo_auth_token()
    reference_id = str(uuid.uuid4())

    url = f"{MOMO_API_BASE_URL}/collection/v1_0/requesttopay"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Reference-Id": reference_id,
        "X-Target-Environment": MOMO_TARGET_ENV,
        "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
        "Content-Type": "application/json"
    }

    # Nettoyage du numéro de téléphone (doit être au format international sans '+')
    clean_phone = phone_number.replace("+", "").replace(" ", "")

    payload = {
        "amount": str(amount_fcfa),
        "currency": "XOF", # FCFA
        "externalId": f"CP360-{int(amount_fcfa)}-{reference_id[:8]}",
        "payer": {
            "partyIdType": "MSISDN",
            "partyId": clean_phone
        },
        "payerMessage": transaction_note,
        "payeeNote": "Merci pour votre achat sur Campus 360"
    }

    response = requests.post(url, headers=headers, json=payload)
    if response.status_code in [200, 202]:
        return {
            "success": True,
            "reference_id": reference_id,
            "status": "PENDING",
            "message": "Demande de paiement envoyée sur le mobile de l'utilisateur."
        }
    else:
        return {
            "success": False,
            "error": response.text,
            "status_code": response.status_code
        }

def check_payment_status(reference_id: str) -> dict:
    """Vérifie si l'utilisateur a saisi son code PIN et validé la transaction."""
    token = get_momo_auth_token()
    url = f"{MOMO_API_BASE_URL}/collection/v1_0/requesttopay/{reference_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Target-Environment": MOMO_TARGET_ENV,
        "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY
    }

    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()

    # Statuts possibles : 'PENDING', 'SUCCESSFUL', 'FAILED'
    return {
        "reference_id": reference_id,
        "status": data.get("status"),
        "financial_transaction_id": data.get("financialTransactionId"),
        "amount": data.get("amount")
    }

if __name__ == "__main__":
    print("💰 Campus 360 — Microservice MTN Mobile Money initialisé.")
