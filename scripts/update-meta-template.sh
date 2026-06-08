#!/bin/bash

# Script para actualizar el template kollybry_comunicado en Meta
# Usa las credenciales de Railway via API

RAILWAY_API="https://api.railway.app"
PROJECT_ID="your-project-id"  # Cambiar si es necesario

# Obtener credenciales de Railway (alternativa: usar Railway CLI)
# Para ahora, asumimos que tienes acceso a ellas

# Las credenciales DEBEN estar en variables de entorno de Railway:
# WABA_BUSINESS_ID
# WABA_ACCESS_TOKEN

# Si las tienes locales en .env:
if [ -f "/Users/alejandrosoria/colibri-collections/backend/.env.production" ]; then
  set -a
  source /Users/alejandrosoria/colibri-collections/backend/.env.production
  set +a
fi

BUSINESS_ID="${WABA_BUSINESS_ID}"
ACCESS_TOKEN="${WABA_ACCESS_TOKEN}"

if [ -z "$BUSINESS_ID" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Error: WABA_BUSINESS_ID o WABA_ACCESS_TOKEN no configurados"
  echo ""
  echo "Para obtenerlos, ve a Railway y copia los valores de:"
  echo "  1. WABA_BUSINESS_ID"
  echo "  2. WABA_ACCESS_TOKEN"
  echo ""
  echo "Luego crea un archivo .env.production con estas variables"
  exit 1
fi

echo "📤 Actualizando template en Meta..."
echo "Business ID: ${BUSINESS_ID:0:10}..."
echo ""

TEMPLATE_BODY="Comunicado de {{1}}

Estimado miembro de la comunidad {{2}}:

{{3}}

Agradecemos tu atención a este comunicado. Para cualquier duda, comunícate directamente con tu organización.

Enviado con {{2}}"

RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v20.0/$BUSINESS_ID/message_templates" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"kollybry_comunicado\",
    \"language\": \"es\",
    \"category\": \"MARKETING\",
    \"components\": [
      {
        \"type\": \"BODY\",
        \"text\": $(echo "$TEMPLATE_BODY" | jq -R -s .)
      }
    ],
    \"access_token\": \"$ACCESS_TOKEN\"
  }")

echo "Respuesta de Meta:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Verificar si fue exitoso
if echo "$RESPONSE" | grep -q '"id"'; then
  echo ""
  echo "✅ Template actualizado exitosamente en Meta"
  echo "Los mensajes deberían enviarse ahora"
else
  echo ""
  echo "⚠️  Posible error. Verifica la respuesta arriba"
  echo ""
  echo "Si el template ya existe, necesitas editarlo manualmente en Meta:"
  echo "  1. Ve a Meta WhatsApp Manager"
  echo "  2. Haz clic en 'kollybry_comunicado'"
  echo "  3. Haz clic en 'Editar plantilla'"
  echo "  4. Reemplaza el contenido del Body con el texto de arriba"
fi
