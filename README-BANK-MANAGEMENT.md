# Bank Management System

This document provides a guide for using the bank management system in the FinFlex API.

## Overview

The bank management system allows administrators to:

1. Add banks to the system with appropriate names and auto-generated bankKeys
2. Assign banks to users
3. Allow users to make payments using their assigned bank

## Bank Configuration

Bank configurations (like API keys, URLs, etc.) are stored in environment variables rather than in the database. The naming convention for these environment variables is:

```
[BANK_KEY]_BASE_URL
[BANK_KEY]_ACCESS_KEY
[BANK_KEY]_MERCHANT_KEY
[BANK_KEY]_CLIENT_ID
[BANK_KEY]_API_PASSWORD
```

For example, if a bank has a bankKey of `akhand-anand-co-op-bank`, the environment variables would be:

```
akhand-anand-co-op-bank_base_url=https://api.akhandbank.com
akhand-anand-co-op-bank_access_key=access_key_value
akhand-anand-co-op-bank_merchant_key=merchant_key_value
akhand-anand-co-op-bank_client_id=client_id_value
akhand-anand-co-op-bank_api_password=api_password_value
```

## API Endpoints

### Bank Management (Admin Only)

| Method | Endpoint                 | Description             |
| ------ | ------------------------ | ----------------------- |
| POST   | /v1/banks                | Create a new bank       |
| GET    | /v1/banks                | Get all banks           |
| GET    | /v1/banks/:bankId        | Get bank details        |
| PATCH  | /v1/banks/:bankId        | Update bank details     |
| DELETE | /v1/banks/:bankId        | Delete a bank           |
| POST   | /v1/banks/assign/:userId | Assign a bank to a user |

### Payment

| Method | Endpoint                 | Description                        |
| ------ | ------------------------ | ---------------------------------- |
| POST   | /v1/payment/make-payment | Make a payment using assigned bank |

## Request/Response Examples

### Create Bank (Admin Only)

**Request:**

```json
POST /v1/banks
{
  "name": "Akhand Anand Co.op Bank"
}
```

**Response:**

```json
{
  "id": "60d21b4667d0d8992e610c85",
  "name": "Akhand Anand Co.op Bank",
  "bankKey": "akhand-anand-co-op-bank",
  "status": "active",
  "createdAt": "2023-06-24T12:00:00.000Z",
  "updatedAt": "2023-06-24T12:00:00.000Z"
}
```

### Assign Bank to User (Admin Only)

**Request:**

```json
POST /v1/banks/assign/60d21b4667d0d8992e610c86
{
  "bankId": "60d21b4667d0d8992e610c85"
}
```

**Response:**

```json
{
  "id": "60d21b4667d0d8992e610c86",
  "email": "user@example.com",
  "phoneNumber": "+911234567890",
  "businessName": "Example Business",
  "user_details": {
    "name": "John Doe",
    "country": "India",
    "gender": "Male"
  },
  "role": "user",
  "assignedBank": "60d21b4667d0d8992e610c85"
}
```

### Make Payment (Using Assigned Bank)

**Request:**

```json
POST /v1/payment/make-payment
{
  "beneficiary_name": "John Doe",
  "beneficiary_account_numb": "123456789012",
  "beneficiary_ifsc_code": "SBIN0001234",
  "amount": "1000",
  "payment_mode": "IMPS",
  "x_reference_no": "REF123456789",
  "bearer_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "status": true,
  "data": {
    "PaymentReferenceNo": "PAY123456789",
    "CMPReferenceNo": "CMP987654321",
    "Status": "SUCCESS",
    "transaction_id": "TXN123456789",
    "amount": "1000.00"
  }
}
```

## Error Handling

### No Bank Assigned

If a user attempts to make a payment without having a bank assigned, they will receive a `400 Bad Request` error:

```json
{
  "code": 400,
  "message": "You do not have an assigned bank. Please contact admin to assign a bank."
}
```

### Inactive Bank

If a user's assigned bank is inactive, they will receive a `400 Bad Request` error:

```json
{
  "code": 400,
  "message": "Your assigned bank is inactive. Please contact admin."
}
```

## Environment Variables Setup

Add the following environment variables for each bank in your `.env` file:

```
# Default/Teja Finance Bank
BANK_TEJA_FINANCE=https://api.tejafinance.com
BANK_ACCESS_KEY=your_access_key
BANK_MERCHANT_KEY=your_merchant_key
BANK_CLIENT_ID=your_client_id
BANK_API_PASSWORD=your_api_password

# Example for additional bank (Akhand Anand Co.op Bank)
akhand-anand-co-op-bank_base_url=https://api.akhandbank.com
akhand-anand-co-op-bank_access_key=your_access_key
akhand-anand-co-op-bank_merchant_key=your_merchant_key
akhand-anand-co-op-bank_client_id=your_client_id
akhand-anand-co-op-bank_api_password=your_api_password
```
