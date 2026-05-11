# WhatsApp Integration Module

This module provides a flexible WhatsApp integration layer for the healthcare appointment platform.

It supports:

- Meta WhatsApp Cloud API
- MessageBird WhatsApp API
- Mock onboarding/testing flows
- Provider switching
- Webhook handling
- Future production extensibility

---

# Architecture Overview

The integration layer is designed to support multiple WhatsApp providers without affecting the appointment system.

Current supported providers:

- META_WHATSAPP
- MESSAGE_BIRD

The system supports:

- provider switching
- mocked onboarding
- webhook event handling
- notification messaging
- future production integration

---

# Current Scope

The current implementation focuses mainly on:

- appointment notifications
- mocked onboarding flows
- provider architecture
- webhook verification
- delivery tracking

It does NOT currently implement:

- full live chat synchronization
- persistent conversation history
- media storage
- real-time doctor dashboard messaging

These can be added later without changing the current architecture.

---

# Provider Selection

Provider selection is controlled through:

- environment variables
- database settings table

The source is controlled by:

```env
PROVIDER_SOURCE=USE_ENV

# WhatsApp Integration Module

This module provides a flexible WhatsApp integration layer for the healthcare appointment platform.

It supports:

- Meta WhatsApp Cloud API
- MessageBird WhatsApp API
- Mock onboarding/testing flows
- Provider switching
- Webhook handling
- Future production extensibility

---

# Architecture Overview

The integration layer is designed to support multiple WhatsApp providers without affecting the appointment system.

Current supported providers:

- META_WHATSAPP
- MESSAGE_BIRD

The system supports:

- provider switching
- mocked onboarding
- webhook event handling
- notification messaging
- future production integration

---

# Current Scope

The current implementation focuses mainly on:

- appointment notifications
- mocked onboarding flows
- provider architecture
- webhook verification
- delivery tracking

It does NOT currently implement:

- full live chat synchronization
- persistent conversation history
- media storage
- real-time doctor dashboard messaging

These can be added later without changing the current architecture.

---

# Provider Selection

Provider selection is controlled through:

- environment variables
- database settings table

The source is controlled by:

```env
PROVIDER_SOURCE=USE_ENV

Available values:

USE_ENV
USE_DB
WhatsApp Providers
Meta WhatsApp

Uses Meta WhatsApp Cloud API.

Features:

Embedded signup mock flow
Webhook verification
Production-style message sending
Mock testing mode
MessageBird

Uses MessageBird WhatsApp API.

Features:

Mock provider support
Production-style send flow
Webhook event handling
Extensible architecture
Environment Variables

Example configuration:
# PROVIDER CONTROL
PROVIDER_SOURCE=USE_ENV
WHATSAPP_PROVIDER=META_WHATSAPP

# META
META_VERIFY_TOKEN=mock_verify_token
META_ACCESS_TOKEN=mock_access_token
META_PHONE_NUMBER_ID=mock_phone_number_id
META_PHONE_NUMBER=+15550000000

# MESSAGEBIRD
MESSAGEBIRD_API_KEY=mock_messagebird_key
MESSAGEBIRD_CHANNEL_ID=mock_channel_id
MESSAGEBIRD_PHONE_NUMBER=+15550000000
MESSAGEBIRD_WEBHOOK_SECRET=mock_webhook_secret

# APP
NEXT_PUBLIC_APP_URL=https://health-typeorm.vercel.app

Database Tables
settings

Stores:

provider source
active provider
feature toggles
whatsapp_integrations

Stores:

doctor integration details
provider info
onboarding state
webhook state
access tokens
business IDs
API Routes
Provider
GET /api/whatsapp/provider

Returns:

active provider
provider source
enabled providers
POST /api/whatsapp/provider

Switch active provider.

Works only when:

PROVIDER_SOURCE=USE_DB
Meta Routes
POST /api/whatsapp/meta/signup

Mock Meta Embedded Signup flow.

Features:

mocked onboarding
fake WABA generation
doctor integration saving
optional test mode
GET /api/whatsapp/meta/status

Returns doctor Meta integration status.

POST /api/whatsapp/meta/send

Send WhatsApp message using:

HOST (.env credentials)
OR
USER (doctor integration)

Supports:

mock mode
production-style API calls
GET /api/whatsapp/meta/webhook

Webhook verification endpoint.

Used by Meta to verify callback URL.

POST /api/whatsapp/meta/webhook

Receives:

incoming messages
delivery statuses
read receipts
webhook events

Currently used mainly for:

logging
debugging
future extensibility
MessageBird Routes
GET /api/whatsapp/messagebird/status

Returns doctor MessageBird integration status.

POST /api/whatsapp/messagebird/send

Send WhatsApp message using MessageBird.

Supports:

HOST mode
USER mode
mock mode
production-style API calls
GET /api/whatsapp/messagebird/webhook

Webhook verification route.

POST /api/whatsapp/messagebird/webhook

Receives:

incoming events
delivery statuses
read receipts

Currently used for:

logging
event tracking
debugging
Test Mode

Most routes support:

{
  "test": true
}

Behavior:

skips real provider calls
returns mocked responses
useful during development/testing
Production Style Mode

When:

{
  "test": false
}

or omitted:

The system attempts real provider API requests.

This requires:

valid credentials
valid provider setup
active business accounts
Webhook Handling

Current webhook implementation:

verifies providers
logs incoming events
logs delivery statuses
prepares architecture for future chat persistence

Current implementation does NOT persist conversations yet.

Future Improvements

Planned future improvements:

conversation persistence
media support
live doctor dashboard chat
unread counts
notification system
AI chatbot support
message retries
analytics
delivery tracking
encrypted token storage
webhook signature validation
Security Notes

Current implementation uses mock/testing flows.

Production improvements recommended:

encrypt provider access tokens
validate webhook signatures
implement rate limiting
add audit logs
use database migrations instead of synchronize
rotate provider credentials
Deployment Notes

Recommended deployment:

Vercel
Neon PostgreSQL
Upstash Redis

Current implementation supports:

local development
mocked testing
production-style provider calls
Important Notes

Current Meta implementation is partially mocked because:

no production Meta Business assets are available
no production WABA exists
onboarding flow is simulated

Architecture is intentionally designed so real credentials can later replace mocked flows with minimal code changes.