#!/bin/bash
# ============================================================================
# Prueba de generación de CLABEs referenciadas con Conekta (Modelo C)
#
# Valida que con la API key del tenant podamos:
#   1. Autenticarnos contra Conekta
#   2. Crear un customer con payment source tipo spei_recurrent
#   3. Recibir la CLABE única referenciada en la respuesta
#
# Uso:
#   CONEKTA_KEY=key_xxxx ./test-conekta-clabes.sh
# ============================================================================

set -e
KEY="${CONEKTA_KEY:?Falta CONEKTA_KEY (key privada de Conekta, ej. key_xxxx)}"
API="https://api.conekta.io"
ACCEPT="application/vnd.conekta-v2.1.0+json"

echo "═══════════════════════════════════════════════════"
echo " PRUEBA CONEKTA — CLABEs referenciadas (SPEI)"
echo "═══════════════════════════════════════════════════"

echo ""
echo "── 1. Validar API key (listar customers) ──"
curl -s "${API}/customers?limit=1" \
  -H "Accept: ${ACCEPT}" \
  -u "${KEY}:" | python3 -m json.tool | head -20

echo ""
echo "── 2. Crear customer de prueba con spei_recurrent ──"
RESPONSE=$(curl -s -X POST "${API}/customers" \
  -H "Accept: ${ACCEPT}" \
  -H "Content-Type: application/json" \
  -u "${KEY}:" \
  -d '{
    "name": "Prueba Kollybry Familia Test",
    "email": "prueba-kollybry@test.com",
    "phone": "+5214625902365",
    "payment_sources": [{ "type": "spei_recurrent" }]
  }')

echo "$RESPONSE" | python3 -m json.tool

echo ""
echo "── 3. Extraer CLABE ──"
echo "$RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'id' not in d:
    print('❌ Error:', d.get('details') or d)
    sys.exit(1)
print('Customer ID:', d['id'])
for ps in d.get('payment_sources', {}).get('data', []):
    print('Tipo:', ps.get('type'))
    # El nombre del campo puede variar — mostramos todos los candidatos
    for k in ('reference_number', 'clabe', 'reference', 'receiving_account_number'):
        if ps.get(k):
            print(f'CLABE ({k}):', ps[k])
    if ps.get('expires_at'):
        print('Expira:', ps['expires_at'])
"
echo ""
echo "Si arriba aparece una CLABE de 18 dígitos → ✅ el modelo funciona."
