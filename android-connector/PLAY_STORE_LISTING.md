# MalawiHub Business Connector — Google Play submission

## App name
MalawiHub Business Connector

## Short description
Securely connect a business phone to MalawiHub for supported mobile-money transaction monitoring.

## Full description
MalawiHub Business Connector links an authorized business phone with MalawiHub Business Hub.

The app's core function is business wallet monitoring. With the business user's permission, it receives supported Airtel Money and TNM Mpamba transaction SMS notifications, extracts relevant transaction information and securely sends the required transaction data to the authorized MalawiHub Business Hub workspace.

Features:
- Secure business-device pairing with a temporary code.
- Supported Airtel Money and TNM Mpamba transaction monitoring.
- Transaction amount, type, balance and reference processing when available.
- Business wallet balance updates and transaction notifications.
- Authenticated device connection to the MalawiHub Business Hub.
- Duplicate transaction protection.

SMS permissions are required because supported transaction SMS processing is a core function of this business utility. The app does not provide general SMS management and does not use SMS information for advertising or sale.

Privacy policy: https://malawihub.pages.dev/privacy.html

## Play permissions declaration

Declare the SMS permissions under the applicable Google Play SMS/call-log use case for SMS-based financial transactions or SMS-based money management, as applicable to the final implementation. Explain that the permission is required for the app's core business wallet monitoring function. Provide a review video demonstrating pairing, granting the required permission, receiving a supported transaction SMS and the resulting authorized Business Hub update.

## Reviewer access

The application requires a valid MalawiHub Business Hub employee account and a supported business phone. Provide Google Play with a dedicated test account and test device/instructions during the Play Console review process. Never provide a production user's credentials.

## Data safety

The final Play Console Data Safety answers must accurately reflect the current implementation. The connector processes financial transaction information, device connection information and SMS-derived transaction information. The data is used for business wallet monitoring and is transmitted to MalawiHub backend services for the authorized Business Hub workspace.
