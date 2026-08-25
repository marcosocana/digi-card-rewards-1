# Integraciones Wallet

La base de datos, los estados de pase y la cola `wallet_jobs` están operativos. Mientras no existan credenciales, los pases permanecen identificados mediante `is_sandbox = true` y la interfaz muestra explícitamente el modo demo. No se presenta una instalación simulada como si fuera real.

## Apple Wallet

Variables exclusivas del backend:

- `APPLE_WALLET_TEAM_ID`
- `APPLE_WALLET_PASS_TYPE_ID`
- `APPLE_WALLET_CERTIFICATE_BASE64`
- `APPLE_WALLET_PRIVATE_KEY_BASE64`
- `APPLE_WALLET_PRIVATE_KEY_PASSWORD`
- `APPLE_WALLET_WWDR_CERTIFICATE_BASE64`
- `WALLET_PUBLIC_BASE_URL`

Quedan pendientes el endpoint de descarga `.pkpass`, el registro de dispositivos y el servicio que procese las actualizaciones de Apple Push Notification Service.

## Google Wallet

Variables exclusivas del backend:

- `GOOGLE_WALLET_ISSUER_ID`
- `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` (JSON sin transformar), o bien
  `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64` (el mismo JSON codificado en Base64)
- `WALLET_PUBLIC_BASE_URL`
- `GOOGLE_WALLET_CLASS_ID` (opcional; acepta el ID completo o solo el sufijo de una clase ya
  creada)

Por compatibilidad temporal también se reconoce el nombre anterior
`GOOGLE_SERVICE_ACCOUNT_JSON`. Sin un `GOOGLE_WALLET_CLASS_ID` explícito, la función crea una clase
por organización. La clase y el objeto se actualizan cuando ya existen y el enlace
`Add to Google Wallet` queda firmado durante una hora.

La cuenta de servicio debe estar añadida como usuario con nivel **Developer** dentro de la cuenta
de emisor en Google Pay & Wallet Console. La API de Google Wallet también debe estar habilitada en
el proyecto de Google Cloud correspondiente.

Los certificados, claves privadas y cuentas de servicio nunca deben utilizar prefijos públicos (`VITE_`) ni almacenarse en el repositorio.
