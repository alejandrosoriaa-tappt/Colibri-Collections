# Conekta SPEI Integration Setup

## Overview

Kollybry integrates with Conekta to generate unique CLABE numbers for SPEI bank transfers. Each invoice can receive a unique CLABE, and payments are automatically reconciled via webhooks.

**Flow:**
1. Create SPEI order in Conekta → Get unique CLABE (18 digits)
2. Send CLABE to contact via WhatsApp
3. Contact transfers MXN to the CLABE
4. Conekta sends `charge.paid` webhook
5. Kollybry marks invoice as paid + sends confirmation WhatsApp

---

## 1. Conekta Account Setup (1-2 days)

### Create Account
1. Go to **https://panel.conekta.com**
2. Sign up with business email
3. Complete KYC verification (24-48 hours)
4. Once approved, you'll get **API Keys**

### Get API Key
1. Dashboard → **Settings** → **API Keys**
2. Copy your **Private Key** (starts with `key_`)
3. Keep this secret!

---

## 2. Railway Environment Variables

Add to your Railway project:

```
CONEKTA_API_KEY=key_xxxxxxxxxxxxx
```

Replace with your actual private key from Conekta.

---

## 3. Configure Webhook

**In Conekta Panel:**
1. Go to **Settings** → **Webhooks**
2. Click **Add Webhook**
3. Enter:
   - **URL**: `https://api.kollybry.com/api/webhooks/conekta`
   - **Events**: Select `charge.paid`
4. Save

**Note:** Conekta supports up to 10 webhooks per environment (sandbox/production).

---

## 4. Database Migration

Run migration 006 to add SPEI fields to invoices table:

```bash
# Option 1: Via script
node -r dotenv/config scripts/run-migrations.js

# Option 2: Manually in Supabase SQL Editor
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS conekta_order_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS conekta_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS conekta_clabe VARCHAR(18),
  ADD COLUMN IF NOT EXISTS conekta_expires_at BIGINT;

CREATE INDEX IF NOT EXISTS idx_invoices_conekta_order_id
ON invoices(conekta_order_id);
```

---

## 5. API Usage

### Create SPEI Order

```javascript
import { createSPEIOrder } from './services/conekta-spei.js'

const result = await createSPEIOrder({
  customerName: 'Nala Soria',
  customerEmail: 'nala@example.com',
  customerPhone: '+521462592365',
  amount: 3500,  // MXN
  concept: 'Mensualidad Colegio'
})

// Returns:
// {
//   success: true,
//   orderId: 'ord_2fsQdMUmsFNP2WjqS',
//   clabe: '646180111812345678',
//   expiresAt: 1700000000,
//   status: 'pending_payment'
// }
```

### Save CLABE to Database

```javascript
await supabase
  .from('invoices')
  .update({
    conekta_order_id: result.orderId,
    conekta_clabe: result.clabe,
    conekta_expires_at: result.expiresAt
  })
  .eq('id', invoiceId)
```

### Send CLABE via WhatsApp

```javascript
// Use existing recordatorio_spei template:
await sendWhatsAppTemplate(
  contact.telefono,
  TEMPLATE_NAMES.RECORDATORIO_SPEI.name,
  TEMPLATE_NAMES.RECORDATORIO_SPEI.lang,
  recordatorioSPEIComponents({
    nombre: contact.nombre,
    orgName: tenant.display_name,
    concepto: invoice.concepto,
    monto: invoice.monto,
    clabe: result.clabe
  })
)
```

---

## 6. Webhook Events

### charge.paid Event

Conekta sends this event when a SPEI transfer is received:

```json
{
  "type": "charge.paid",
  "data": {
    "object": {
      "id": "63efa757cf65380001aec040",        // charge ID
      "order_id": "ord_2fsQdMUmsFNP2WjqS",    // ← Use to find invoice
      "amount": 350000,                         // in centavos
      "status": "paid",
      "paid_at": 1676390742,                   // Unix timestamp
      "payment_method": {
        "receiving_account_number": "646180111812345678"
      }
    }
  }
}
```

**Handler:** `POST /api/webhooks/conekta`
- Finds invoice by `conekta_order_id`
- Marks invoice as `paid`
- Sends WhatsApp confirmation

---

## 7. Pricing

Conekta charges per successful SPEI transaction:
- **Fee**: Negotiable based on volume (confirm with your account executive)
- **Billed to**: Your Conekta account (not directly to contacts)
- **No fee** for failed transfers

Check **Settings → Pricing** in Conekta Panel for your rates.

---

## 8. Testing

### Sandbox vs Production

- **Sandbox**: Test mode, no real transfers. Add `_test` to API key to use sandbox.
- **Production**: Real money. Requires KYC approval.

### Test Payment Flow

1. Create a test SPEI order
2. Conekta provides a test CLABE
3. Use Conekta's test tools to simulate payment
4. Webhook will deliver `charge.paid` event
5. Verify invoice marked as `paid` in DB

---

## 9. Troubleshooting

### Webhook not received
- Verify webhook URL is publicly accessible
- Check Conekta panel for webhook delivery logs
- Ensure `conekta_order_id` matches in webhook

### Payment not reconciled
- Check that `conekta_order_id` was saved correctly to invoice
- Verify webhook handler is running without errors
- Check application logs for webhook processing errors

### CLABE not generated
- Verify `CONEKTA_API_KEY` is configured
- Check Conekta account is approved (KYC complete)
- Ensure API key has permission for `orders` endpoint

---

## Files Reference

- **Service**: `backend/src/services/conekta-spei.js`
- **Webhook Handler**: `backend/src/routes/webhooks.js`
- **Migration**: `backend/src/db/migrations/006_add_conekta_spei_fields.sql`
- **Templates**: `backend/src/templates/whatsappTemplates.js` (RECORDATORIO_SPEI)

