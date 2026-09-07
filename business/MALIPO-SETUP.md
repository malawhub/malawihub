# MalawiHub Business — Malipo setup

MalawiHub Business now uses Malipo as the payment gateway for Airtel Money and TNM Mpamba.

## 1. Get Malipo credentials

Create/activate the MalawiHub merchant/developer project in the Malipo portal and obtain:

- `MALIPO_API_KEY`
- `MALIPO_APP_ID`

Do **not** put these values in `business/index.html`, JavaScript files, GitHub, or the browser.

## 2. Add credentials to Supabase Edge Function secrets

In the Supabase project, add these project secrets:

- `MALIPO_API_KEY`
- `MALIPO_APP_ID`

The `malipo-business` Edge Function reads them server-side.

## 3. Configure Malipo callback/IPN

Set the Malipo callback URL to:

`https://cdqrdovgdidzxmyygoee.supabase.co/functions/v1/malipo-callback`

The callback expects Malipo's documented fields:

- `status`
- `merchant_trx_id`
- `transaction_id`
- `customer_reference`

## 4. Supported operations

The Business Hub server integration supports:

- Airtel Money payment requests (`bankId=1`)
- TNM Mpamba payment requests (`bankId=2`)
- Malipo transaction enquiry
- Malipo account balance retrieval
- Malipo callback/IPN processing
- Automatic Business Hub transaction creation after completed payment
- Automatic employer notification after completed payment

## 5. Important

The software integration is deployed, but real money movement remains disabled until valid Malipo credentials are configured and the Malipo merchant/project callback is registered.
