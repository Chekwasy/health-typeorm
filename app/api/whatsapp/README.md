# WhatsApp Integration Module

This module provides a scalable WhatsApp integration layer for the healthcare appointment platform.

The goal of this implementation is to support multiple WhatsApp providers while keeping the appointment system provider-agnostic and extensible for future production integrations.

---

# Supported Providers

The system currently supports:

- META_WHATSAPP
- MESSAGE_BIRD

Both providers are implemented using a common architecture pattern to ensure scalability and maintainability.

---

# Current Implementation Scope

The current implementation focuses on:

- WhatsApp onboarding flows
- Appointment notification messaging
- Provider abstraction
- Webhook verification
- Delivery status handling
- Mock testing support
- Production-style API architecture

The implementation is intentionally designed to support future production migration with minimal code changes.

---

# Current Limitations

The following features are NOT yet implemented:

- persistent chat history
- live real-time messaging dashboard
- media storage
- doctor-patient chat synchronization
- unread message tracking
- socket-based communication

Webhook and provider architecture were designed to support these features later.

---

# Architecture Overview

The module uses a provider-based architecture.

This allows the system to:

- switch providers dynamically
- support multiple providers simultaneously
- isolate provider-specific logic
- extend integrations easily in the future

---

# High-Level Flow

Doctor connects provider
↓
Integration saved in database
↓
Appointment system sends notifications
↓
Provider handles delivery
↓
Webhook receives provider events
↓
System logs statuses/events

---

# Database Tables

## settings

Stores global provider configuration.

Used for:

- provider selection
- feature toggles
- mock mode configuration
- provider source control

Example fields:

- provider_source
- whatsapp_provider
- enable_meta_whatsapp
- enable_messagebird
- enable_mock_mode

---

## whatsapp_integrations

Stores provider integrations for doctors.

Each doctor may have:

- one META_WHATSAPP integration
- one MESSAGE_BIRD integration

Duplicate provider integrations are prevented using database uniqueness constraints.

Stores:

- onboarding status
- access tokens
- business information
- provider metadata
- webhook configuration

---

# Provider Selection

Provider selection supports two modes.

## USE_ENV

Provider controlled via environment variables.

Example:

```env
PROVIDER_SOURCE=USE_ENV
WHATSAPP_PROVIDER=MESSAGE_BIRD
```

---

## USE_DB

Provider controlled dynamically from database settings.

Example:

```env
PROVIDER_SOURCE=USE_DB
```

This allows runtime switching without redeployment.

---

# Environment Variables

## Provider Control

```env
PROVIDER_SOURCE=USE_ENV
WHATSAPP_PROVIDER=MESSAGE_BIRD
```

---

## Meta WhatsApp

```env
META_VERIFY_TOKEN=mock_verify_token
META_ACCESS_TOKEN=mock_access_token
META_PHONE_NUMBER_ID=mock_phone_number_id
META_PHONE_NUMBER=+15550000000
```

---

## MessageBird

```env
MESSAGEBIRD_API_KEY=mock_messagebird_key
MESSAGEBIRD_CHANNEL_ID=mock_channel_id
MESSAGEBIRD_PHONE_NUMBER=+15550000000
MESSAGEBIRD_WEBHOOK_SECRET=mock_webhook_secret
```

---

## Application

```env
NEXT_PUBLIC_APP_URL=https://health-typeorm.vercel.app
```

---

# API Routes

# Provider Routes

## GET `/api/whatsapp/provider`

Returns:

- active provider
- provider source
- enabled providers
- mock mode state

---

## POST `/api/whatsapp/provider`

Switches active provider.

Works only when:

```env
PROVIDER_SOURCE=USE_DB
```

---

# Meta WhatsApp Routes

## POST `/api/whatsapp/meta/signup`

Mock Meta Embedded Signup implementation.

Features:

- mocked onboarding flow
- mocked token generation
- mocked WABA generation
- doctor integration persistence
- duplicate integration prevention
- optional test mode

---

## GET `/api/whatsapp/meta/status`

Returns Meta integration status for authenticated doctor.

Includes:

- onboarding state
- webhook state
- configuration validation
- provider metadata

---

## POST `/api/whatsapp/meta/send`

Sends WhatsApp message using Meta provider.

Supports:

- HOST mode (.env credentials)
- USER mode (doctor credentials)
- mock mode
- production-style API calls

---

## GET `/api/whatsapp/meta/webhook`

Meta webhook verification endpoint.

Used by Meta to verify:

- callback URL
- verify token

---

## POST `/api/whatsapp/meta/webhook`

Receives Meta webhook events.

Handles:

- incoming messages
- delivery statuses
- media events
- read receipts

Current implementation mainly performs:

- logging
- debugging
- provider ownership resolution

Architecture prepared for future persistence.

---

# MessageBird Routes

## POST `/api/whatsapp/messagebird/signup`

Mock MessageBird onboarding implementation.

Features:

- mocked onboarding flow
- mocked channel generation
- mocked workspace generation
- doctor integration persistence
- duplicate integration prevention
- optional test mode

---

## GET `/api/whatsapp/messagebird/status`

Returns MessageBird integration status.

Includes:

- onboarding state
- webhook state
- channel information
- configuration validation

---

## POST `/api/whatsapp/messagebird/send`

Sends WhatsApp message using MessageBird.

Supports:

- HOST mode
- USER mode
- mock mode
- production-style API calls

---

## GET `/api/whatsapp/messagebird/webhook`

MessageBird webhook verification endpoint.

---

## POST `/api/whatsapp/messagebird/webhook`

Receives MessageBird webhook events.

Handles:

- incoming messages
- delivery statuses
- media events

Current implementation focuses on:

- logging
- event tracking
- provider ownership resolution

---

# Test Mode

Most routes support:

```json
{
  "test": true
}
```

When enabled:

- provider calls are mocked
- database persistence may be skipped
- simulated responses are returned

Useful for:

- development
- testing
- onboarding simulation

---

# Production-Style Mode

When:

```json
{
  "test": false
}
```

or omitted:

The system attempts provider API calls using configured credentials.

Requires:

- valid provider credentials
- active business setup
- valid webhook configuration

---

# Webhook Handling

Webhook implementation currently supports:

- provider verification
- incoming message events
- delivery status tracking
- provider ownership lookup
- media event logging

Conversation persistence is intentionally deferred for future implementation.

---

# Security Notes

Current implementation uses mocked/testing flows.

Recommended production improvements:

- encrypt access tokens
- validate webhook signatures
- add rate limiting
- implement audit logs
- use database migrations
- rotate provider credentials
- add webhook retry handling

---

# Future Improvements

Planned future improvements include:

- persistent chat history
- live doctor messaging dashboard
- media storage
- AI chatbot support
- analytics
- unread counts
- retry handling
- delivery insights
- websocket communication
- real-time notifications

---

# Deployment Recommendations

Recommended stack:

- Vercel
- Neon PostgreSQL
- Upstash Redis

Current implementation supports:

- local development
- mocked testing
- production-style provider calls

---

# Important Notes

Current Meta implementation is partially mocked because production Meta Business assets are not yet available.

The architecture was intentionally designed so real provider credentials can later replace mocked flows with minimal code changes.
