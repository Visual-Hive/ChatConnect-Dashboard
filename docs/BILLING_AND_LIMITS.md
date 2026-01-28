# ChatConnect Dashboard - Billing & Rate Limits

**Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Planning

---

## Overview

ChatConnect uses a tiered pricing model designed to let users test the product risk-free before committing to a paid plan. This document outlines the rate limiting strategy, billing rules, and implementation details.

---

## Tier Definitions

### Free Tier

**Purpose:** Allow potential customers to test the widget in a safe environment before purchasing.

| Feature | Value |
|---------|-------|
| Cost | $0 |
| Dashboard access | ✅ Full access |
| Widget testing | ✅ Dashboard preview only |
| External deployment | ❌ Not allowed |
| Rate limit | 100 requests/hour |
| LLM Model | GPT-4o-mini |
| Knowledge base | ✅ Up to 10 documents |
| Email alerts | ❌ |

**Restrictions:**
- Widget ONLY works when `Origin` matches the ChatConnect dashboard domain
- Embed code is visible but clearly marked "Upgrade to deploy"
- After 100 requests/hour, widget shows friendly upgrade prompt
- No billing, no credit card required

**User Experience:**
```
Free user in dashboard:
┌────────────────────────────────────────┐
│  Widget Preview                        │
│  ┌──────────────────────────────────┐ │
│  │ [Your widget preview here]       │ │
│  │                                  │ │
│  │ This preview works only in the   │ │
│  │ dashboard. Upgrade to deploy     │ │
│  │ to your website.                 │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [Upgrade to Deploy] [Copy Code ⚠️]   │
└────────────────────────────────────────┘
```

---

### Paid Tier (Starter Plan)

**Purpose:** Production deployment with reasonable limits for small to medium traffic.

| Feature | Value |
|---------|-------|
| Cost | $XX/month (TBD) |
| Dashboard access | ✅ Full access |
| Widget testing | ✅ Unlimited |
| External deployment | ✅ Any allowed domain |
| Rate limit | 1,000 requests/hour included |
| Overage | $X per 100 requests (TBD) |
| LLM Model | Claude Sonnet 4.5 |
| Knowledge base | ✅ Up to 100 documents |
| Email alerts | ✅ At 80% usage |
| Hard cap option | ✅ Optional |

**Overage Handling:**

1. **Default (Pay overage):**
   - Widget continues working after 1000 req/hour
   - Each additional 100 requests billed at overage rate
   - Invoice at end of billing period
   - Email alert at 80% (800 requests)

2. **Hard cap enabled:**
   - Widget stops responding at limit
   - Shows "Service temporarily unavailable"
   - No overage charges
   - Email alert at 80% and 100%

---

## Rate Limiting Implementation

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Widget    │────▶│   Python    │────▶│    Redis    │
│             │     │   Backend   │     │  (Counter)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ PostgreSQL  │
                    │ (Usage Log) │
                    └─────────────┘
```

### Redis Key Structure

```
# Rate limit counter (expires hourly)
rate_limit:{client_id}:{hour_timestamp}

# Example: rate_limit:client_abc123:2025012814
# Value: Current request count for this hour
# TTL: 3600 seconds (1 hour)
```

### Algorithm

```python
async def check_and_increment_rate_limit(
    client_id: str,
    tier: str,
    settings: ClientSettings
) -> RateLimitResult:
    """
    Check rate limit and increment counter.
    
    Returns:
        RateLimitResult with allowed, current_count, limit, is_overage
    """
    # Calculate hour bucket
    hour_bucket = int(time.time() // 3600)
    key = f"rate_limit:{client_id}:{hour_bucket}"
    
    # Get limit based on tier
    if tier == "free":
        limit = 100
        allow_overage = False
    else:
        limit = settings.hourly_limit or 1000
        allow_overage = not settings.hard_cap_enabled
    
    # Atomic increment
    current = await redis.incr(key)
    
    # Set expiry on first request of the hour
    if current == 1:
        await redis.expire(key, 3600)
    
    # Check if over limit
    if current > limit:
        if allow_overage:
            # Record overage for billing
            await record_overage_request(client_id, hour_bucket)
            return RateLimitResult(
                allowed=True,
                current_count=current,
                limit=limit,
                is_overage=True
            )
        else:
            return RateLimitResult(
                allowed=False,
                current_count=current,
                limit=limit,
                is_overage=False
            )
    
    return RateLimitResult(
        allowed=True,
        current_count=current,
        limit=limit,
        is_overage=False
    )
```

### Response Headers

All widget API responses include rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1706454000
```

### Rate Limit Exceeded Response

**Free Tier:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You've reached the testing limit. Upgrade to continue.",
    "upgrade_url": "https://chatconnect.com/upgrade"
  }
}
```

**Paid Tier (Hard Cap):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Hourly limit reached. Service will resume at the next hour.",
    "reset_at": "2025-01-28T15:00:00Z"
  }
}
```

---

## Deployment Restrictions

### Free Tier Domain Check

```python
DASHBOARD_DOMAINS = [
    "chatconnect.com",
    "www.chatconnect.com",
    "app.chatconnect.com",
    "localhost:5000",  # Development
    "localhost:3000",  # Development
]

async def check_deployment_allowed(
    client_id: str,
    tier: str,
    origin: str
) -> bool:
    """
    Check if widget is allowed to run on this origin.
    
    Free tier: Only dashboard domains
    Paid tier: Any domain in client's allowedDomains list
    """
    if tier == "free":
        # Free tier can only use widget on dashboard
        parsed = urlparse(origin)
        return parsed.netloc in DASHBOARD_DOMAINS
    
    # Paid tier: Check against allowed domains
    client = await get_client(client_id)
    return is_origin_allowed(origin, client.allowed_domains)
```

### Error Response for Unauthorized Deployment

```json
{
  "success": false,
  "error": {
    "code": "DEPLOYMENT_NOT_ALLOWED",
    "message": "Widget deployment requires a paid plan.",
    "upgrade_url": "https://chatconnect.com/upgrade"
  }
}
```

---

## Email Alerts

### Alert Types

| Alert | Trigger | Recipients |
|-------|---------|------------|
| Usage Warning | 80% of hourly limit | Account owner |
| Limit Reached | 100% of hourly limit (hard cap) | Account owner |
| Overage Summary | End of billing period | Account owner |
| Payment Failed | Billing failure | Account owner |

### Usage Warning Email

```
Subject: ⚠️ ChatConnect: Approaching usage limit

Hi {name},

Your ChatConnect widget is at 80% of your hourly limit.

Current usage: 800 / 1,000 requests this hour
Time until reset: 23 minutes

If you frequently reach your limit, consider:
- Upgrading to a higher plan
- Enabling usage alerts earlier
- Reviewing your widget traffic patterns

[View Dashboard] [Upgrade Plan]

---
ChatConnect Team
```

### Limit Reached Email (Hard Cap)

```
Subject: 🛑 ChatConnect: Hourly limit reached

Hi {name},

Your ChatConnect widget has reached its hourly limit and is 
temporarily unavailable.

Usage: 1,000 / 1,000 requests
Service resumes: {reset_time}

Your hard cap setting prevented overage charges. If you'd 
prefer uninterrupted service, you can:
- Disable hard cap (pay for overages)
- Upgrade to a higher plan

[View Dashboard] [Manage Settings]

---
ChatConnect Team
```

---

## Database Schema

### Usage Stats Table

```sql
CREATE TABLE usage_stats (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR NOT NULL REFERENCES clients(id),
  
  -- Time bucket
  date DATE NOT NULL,
  hour INTEGER NOT NULL,  -- 0-23
  
  -- Counts
  request_count INTEGER NOT NULL DEFAULT 0,
  overage_count INTEGER NOT NULL DEFAULT 0,
  
  -- Tokens (for cost tracking)
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Unique constraint for upsert
  UNIQUE(client_id, date, hour)
);

CREATE INDEX idx_usage_stats_client_date 
  ON usage_stats(client_id, date);
```

### Billing Events Table

```sql
CREATE TABLE billing_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR NOT NULL REFERENCES clients(id),
  
  -- Event details
  event_type VARCHAR NOT NULL,  -- 'overage', 'subscription', 'payment'
  
  -- Amounts (in cents)
  amount_cents INTEGER NOT NULL,
  
  -- Metadata
  details JSONB NOT NULL DEFAULT '{}',
  
  -- Status
  status VARCHAR NOT NULL DEFAULT 'pending',  -- 'pending', 'processed', 'failed'
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_billing_events_client 
  ON billing_events(client_id, created_at);
```

### Client Settings Extension

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS
  tier VARCHAR NOT NULL DEFAULT 'free',
  hourly_limit INTEGER DEFAULT 100,
  hard_cap_enabled BOOLEAN DEFAULT FALSE,
  overage_rate_cents INTEGER DEFAULT 10,  -- $0.10 per 100 requests
  alert_threshold DECIMAL(3,2) DEFAULT 0.80,  -- 80%
  alert_email VARCHAR;
```

---

## Dashboard UI

### Usage Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Usage This Month                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [========================================    ]      │   │
│  │  18,432 / 24,000 requests (76.8%)                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Current Hour: 234 / 1,000                                  │
│  Resets in: 42 minutes                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Daily Usage (Last 7 Days)                          │   │
│  │  [Bar chart visualization]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Estimated Bill: $49.00 + $12.30 overage = $61.30          │
│                                                             │
│  Settings:                                                  │
│  ☑ Email alerts at 80% usage                               │
│  ☐ Enable hard cap (prevent overages)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Basic Rate Limiting
- [ ] Redis counter implementation
- [ ] Rate limit middleware in Python backend
- [ ] Response headers
- [ ] Basic usage logging to PostgreSQL

### Phase 2: Tier Enforcement
- [ ] Free tier domain restriction
- [ ] Deployment check middleware
- [ ] Upgrade prompts in widget
- [ ] Dashboard preview mode

### Phase 3: Billing
- [ ] Usage stats aggregation
- [ ] Overage tracking
- [ ] Billing events table
- [ ] Integration with payment provider (Stripe?)

### Phase 4: Alerts
- [ ] Email service integration
- [ ] Alert threshold configuration
- [ ] Usage warning emails
- [ ] Limit reached emails

### Phase 5: Dashboard
- [ ] Usage visualization
- [ ] Settings UI
- [ ] Billing history
- [ ] Invoice download

---

## Open Questions

1. **Pricing:** What are the actual dollar amounts?
   - Monthly subscription: $__/month
   - Overage rate: $__/100 requests
   - Higher tiers?

2. **Trial Period:** Should paid features have a free trial?
   - 14-day trial?
   - Limited requests trial?

3. **Annual Billing:** Discount for annual payment?

4. **Enterprise Tier:** Custom limits for large customers?

5. **Refunds:** Policy for overages due to abuse/bots?

---

## Security Considerations

1. **Rate limit bypass prevention:**
   - API key rotation doesn't reset limits
   - Client ID is the limiting factor, not API key

2. **Abuse detection:**
   - Monitor for unusual patterns
   - Flag accounts with consistent 100% usage
   - Consider CAPTCHA for suspicious activity

3. **Billing security:**
   - All financial data via Stripe (PCI compliant)
   - No credit card numbers stored locally
   - Audit log for all billing events

---

*Document created: January 2025*
