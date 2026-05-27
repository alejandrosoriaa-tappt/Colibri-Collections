#!/usr/bin/env python3
"""Insert demo message_logs for Torre Altavista and Colegio Las Américas"""
import json, uuid, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

import os
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://jklqukssyxbfzefwpgaw.supabase.co")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

def api(method, path, body=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            text = r.read().decode()
            return json.loads(text) if text.strip() else []
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERROR {e.code}: {body[:200]}")
        return None

def dt(days_ago=0, hour=9):
    d = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return d.replace(hour=hour, minute=0, second=0, microsecond=0).isoformat()

# ─────────────────────────────────────────────────────────────────
# TORRE ALTAVISTA
# ─────────────────────────────────────────────────────────────────
TORRE_ID = "e0f963f2-becb-46ab-9bad-84f7fc1d171e"
JUNIO_CAMP = "5a50fe04-6108-437b-86db-cc833b9ec94e"   # active
MAYO_CAMP  = "64de597a-1d33-46d0-bf22-d428e344faae"   # completed

torre_contacts = [
    ("3a128369-e8f6-4724-a107-fb6828ff2f49", "María",     "+5215512345601"),
    ("39e58bfa-25fd-4c4a-b119-e0fd498335b4", "Carlos",    "+5215512345602"),
    ("80863d68-4384-4575-b873-f7cec2085acd", "Ana",       "+5215512345603"),
    ("396c673e-861f-45db-82df-8eb4767edc19", "Luis",      "+5215512345604"),
    ("8b3a512a-6480-40ac-8598-83fbea54f2f7", "Sofía",     "+5215512345605"),
    ("6bdb219a-7a0c-4a4e-8a04-a23a58dda209", "Jorge",     "+5215512345606"),
    ("03927de4-7a2b-4be0-abda-40059bfc0958", "Laura",     "+5215512345607"),
    ("9ea0b0af-cec0-421e-9c08-66e450755f05", "Miguel",    "+5215512345608"),
    ("c695cdc8-eb7f-4e66-84db-cd935eb16ca9", "Isabel",    "+5215512345609"),
    ("8376bbcf-a37f-4489-993e-53b44ed2af0a", "Roberto",   "+5215512345610"),
    ("5f4cb029-6bbe-413d-9c78-463def940b30", "Patricia",  "+5215512345611"),
    ("ea853fe7-d7d7-4680-bf31-1f2cfbd2395e", "Andrés",    "+5215512345612"),
    ("de4b10e2-4893-4684-a4db-dc1ee58fccd5", "Verónica",  "+5215512345613"),
    ("01a31236-baf2-42b2-8ed7-f14c6d3da238", "Fernando",  "+5215512345614"),
    ("e089960d-ecf2-429a-a5ff-3fddfa076fdd", "Claudia",   "+5215512345615"),
    ("5ace0c97-c949-4877-9a73-bf3c41104dd1", "Ricardo",   "+5215512345616"),
    ("867b6155-2dfa-4ee5-95c1-5c11a76ea976", "Gabriela",  "+5215512345617"),
    ("24df2a6f-076d-4f83-9dac-2d78082a1816", "Eduardo",   "+5215512345618"),
    ("fdfcc187-6b35-4f1f-90e7-36a5b0a78ae2", "Valeria",   "+5215512345619"),
    ("6006d9e2-6fbe-4390-938e-a738954b7161", "Alejandro", "+5215512345620"),
    ("bf5f9ab6-06c6-4d9b-b874-9176fca54349", "Mariana",   "+5215512345621"),
    ("30f87912-08b0-4b51-86a1-ac173c1df591", "Daniel",    "+5215512345622"),
    ("c5792da8-2bdb-4275-8c5e-745882b42fa8", "Carmen",    "+5215512345623"),
    ("f887948c-4e0a-4f16-9663-97e89e26a258", "Sergio",    "+5215512345624"),
]

# Junio 2026 (active, sent 5 days ago): 15 read, 5 delivered, 4 sent
junio_statuses = ["read"]*15 + ["delivered"]*5 + ["sent"]*4
# Mayo 2026 (completed, 32 days ago): 22 read, 2 sent
mayo_statuses  = ["read"]*22 + ["sent"]*2

logs_torre = []
for i, (cid, nombre, phone) in enumerate(torre_contacts):
    # Junio
    logs_torre.append({
        "id": str(uuid.uuid4()),
        "tenant_id": TORRE_ID,
        "campaign_id": JUNIO_CAMP,
        "contact_id": cid,
        "message_number": i + 1,
        "message_text": f"Hola {nombre}, recordatorio de cuota de mantenimiento Junio 2026 $1,200 MXN. Puedes pagar en: https://pay.kollybry.com/torre",
        "phone": phone,
        "wa_message_id": f"wamid.TORRE_JUNIO_{i+1:03d}",
        "status": junio_statuses[i],
        "sent_at": dt(days_ago=5, hour=9),
    })
    # Mayo
    logs_torre.append({
        "id": str(uuid.uuid4()),
        "tenant_id": TORRE_ID,
        "campaign_id": MAYO_CAMP,
        "contact_id": cid,
        "message_number": i + 1,
        "message_text": f"Hola {nombre}, tu cuota de mantenimiento Mayo 2026 por $1,200 está pendiente. Liga de pago: https://pay.kollybry.com/torre",
        "phone": phone,
        "wa_message_id": f"wamid.TORRE_MAYO_{i+1:03d}",
        "status": mayo_statuses[i],
        "sent_at": dt(days_ago=32, hour=10),
    })

# ─────────────────────────────────────────────────────────────────
# COLEGIO LAS AMÉRICAS
# ─────────────────────────────────────────────────────────────────
COLEGIO_ID     = "8a2ffde5-9392-467b-9a1d-d0172cefc12c"
COL_JUNIO      = "a9efce91-2e59-40b6-9d02-f3516606103e"  # active
COL_MAYO       = "03ec3df0-b1da-4cd6-ab96-8d92d3e103aa"  # completed
COL_ACTIVIDADES= "5ceda982-213c-45c8-9d00-cc92b50bb11f"  # completed
COL_NOV        = "ad96db2b-a1d5-4a94-af06-ed8f38deabff"  # active
COL_OCT        = "7752dc1e-36c4-4db2-ad97-1ff588f542e0"  # completed

colegio_contacts = [
    ("42cd72d6-7cf8-4f97-a19e-4179127a0b90", "María",      "+5215513000001", "1ro A"),
    ("b1e78ee6-1828-4189-a45d-7361cf131440", "Patricia",   "+5215513000002", "1ro A"),
    ("c69a71fc-d306-4061-a094-777fe823fdd2", "José",       "+5215513000003", "1ro B"),
    ("567a7119-2e43-4054-a8b4-e0797a27ffc9", "Claudia",    "+5215513000004", "1ro B"),
    ("10b3188d-a8d3-47b0-8801-9d8fac351e6b", "Eduardo",    "+5215513000005", "2do A"),
    ("f90cadc0-52b2-4048-b144-d1d1199f74c2", "Adriana",    "+5215513000006", "2do A"),
    ("86f52154-0d17-4468-bf7f-724253cc705f", "Marco",      "+5215513000007", "2do B"),
    ("4ac104cb-c23c-4b77-9437-141189058856", "Laura",      "+5215513000008", "2do B"),
    ("7abd682e-872e-4275-82d4-3c037e0f0aa1", "Carlos",     "+5215513000009", "3ro A"),
    ("75a36cc5-b68c-4604-b02c-81f03ffffe30", "Verónica",   "+5215513000010", "3ro A"),
    ("b6ffdb93-047f-4ac5-90c3-5a3cd877f08b", "Luis",       "+5215513000011", "3ro B"),
    ("dbca606e-8a46-42ac-b462-7567e87bb90a", "Sandra",     "+5215513000012", "3ro B"),
    ("8060945c-03ea-4d1c-9d83-748e280f06fe", "Roberto",    "+5215513000013", "4to A"),
    ("03c74293-4aaf-4c0c-adc7-87d24a5ac6ce", "Mónica",     "+5215513000014", "4to A"),
    ("5593d18e-7189-4408-aa14-21ef0d6ccbf4", "Fernando",   "+5215513000015", "4to B"),
    ("3e27d545-b556-4baf-8b9f-13cf85cb2edd", "Ana",        "+5215513000016", "4to B"),
    ("19230994-9c45-4845-a550-8faf3ab78f0a", "Ricardo",    "+5215513000017", "5to A"),
    ("7a7b8af1-42ad-4163-8e5f-33f26ab16e5d", "Silvia",     "+5215513000018", "5to A"),
    ("338e0233-95a6-4e77-8301-198a7331c613", "Manuel",     "+5215513000019", "5to B"),
    ("9c86df2c-9527-4748-9c92-e690dd26ec48", "Esperanza",  "+5215513000020", "5to B"),
    ("4228c418-a4ca-4d8c-8509-9d61e716a181", "Jorge",      "+5215513000021", "6to A"),
    ("d6f1b2e7-6508-4c30-b270-00ddafdd4a71", "Beatriz",    "+5215513000022", "6to A"),
    ("d4b4c10b-414d-4494-ba35-b8bb1a938115", "Arturo",     "+5215513000023", "6to B"),
    ("7a8d55c7-e113-4e2b-aeb5-fcff5b030275", "Elena",      "+5215513000024", "6to B"),
    ("12706907-bc02-4c07-864c-4c73067cb97e", "David",      "+5215513000025", "1ro A"),
    ("68fb031e-a7ac-48cd-a2ac-ee5573256645", "Yolanda",    "+5215513000026", "2do A"),
    ("633f8ef4-9083-4af8-bc5f-683832656bd3", "Alejandro",  "+5215513000027", "3ro A"),
    ("3fc301f5-0d9c-4c6d-86ea-74806f3926b1", "Teresa",     "+5215513000028", "4to A"),
    ("80365b5b-4aae-4e39-b9ea-7adc46209d15", "Francisco",  "+5215513000029", "5to A"),
    # skip 6715e2c0 — empty nombre
]

n = len(colegio_contacts)

# Junio (active, 3 days ago): 22 read, 5 delivered, 3 sent
junio_col = ["read"]*22 + ["delivered"]*5 + ["sent"]*3
# Mayo (completed, 35 days ago): 27 read, 2 sent
mayo_col  = ["read"]*27 + ["sent"]*2
# Actividades (completed, 60 days ago): 25 read, 4 sent
act_col   = ["read"]*25 + ["sent"]*4
# Noviembre (active, 200 days ago): 28 read, 1 sent
nov_col   = ["read"]*28 + ["sent"]*1
# Octubre (completed, 230 days ago): 26 read, 3 sent
oct_col   = ["read"]*26 + ["sent"]*3

logs_col = []
for i, (cid, nombre, phone, salon) in enumerate(colegio_contacts):
    def log(camp_id, wa_prefix, status_list, days_ago, hour=9):
        return {
            "id": str(uuid.uuid4()),
            "tenant_id": COLEGIO_ID,
            "campaign_id": camp_id,
            "contact_id": cid,
            "message_number": i + 1,
            "message_text": f"Hola {nombre}, recordatorio de colegiatura del salón {salon}. Por favor realiza tu pago a tiempo.",
            "phone": phone,
            "wa_message_id": f"wamid.{wa_prefix}_{i+1:03d}",
            "status": status_list[i] if i < len(status_list) else "sent",
            "sent_at": dt(days_ago=days_ago, hour=hour),
        }
    logs_col.append(log(COL_JUNIO,       "COL_JUN",  junio_col, 3,   9))
    logs_col.append(log(COL_MAYO,        "COL_MAYO", mayo_col,  35,  10))
    logs_col.append(log(COL_ACTIVIDADES, "COL_ACT",  act_col,   60,  9))
    logs_col.append(log(COL_NOV,         "COL_NOV",  nov_col,   200, 10))
    logs_col.append(log(COL_OCT,         "COL_OCT",  oct_col,   230, 9))

# ─────────────────────────────────────────────────────────────────
# DELETE existing logs & insert
# ─────────────────────────────────────────────────────────────────
print("🗑  Deleting existing message_logs for Torre...")
api("DELETE", f"message_logs?tenant_id=eq.{TORRE_ID}")

print("🗑  Deleting existing message_logs for Colegio...")
api("DELETE", f"message_logs?tenant_id=eq.{COLEGIO_ID}")

# Insert in batches of 100
def insert_batch(logs, label):
    total = 0
    for start in range(0, len(logs), 100):
        chunk = logs[start:start+100]
        result = api("POST", "message_logs", chunk)
        if result is not None:
            total += len(chunk)
            print(f"  ✅ {label}: inserted {total}/{len(logs)}")
        else:
            print(f"  ❌ {label}: error on chunk starting at {start}")
    return total

print(f"\n📨 Inserting {len(logs_torre)} message_logs for Torre Altavista...")
insert_batch(logs_torre, "Torre")

print(f"\n📨 Inserting {len(logs_col)} message_logs for Colegio Las Américas...")
insert_batch(logs_col, "Colegio")

print("\n✅ Done!")
