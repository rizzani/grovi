# Grovi GitHub Labels

**Naming, Descriptions, and Colors (Onboarding Reference)**

## Purpose
This document defines Grovi’s GitHub issue labels so contributors can triage work quickly, pick tasks confidently, and maintain a predictable workflow as the team grows.

## Labeling Rules
- Every issue should have exactly 1 type, 1 priority, 1 size, and 1 platform label.
- Add 1–2 area labels to indicate the domain/module affected.
- Use actor, integration, NFR, and status labels only when relevant.
- If an issue feels like size: XL, split it into smaller issues before starting.

> **Note:** GitHub label colors use hex codes **without** the `#` prefix.

## Label Catalog
### Type Labels
| Label | Description | Color (Hex) |
| --- | --- | --- |
| type: feature | New user-facing capability or product functionality. | 1D76DB |
| type: bug | Something is broken or not behaving as intended. | D73A4A |
| type: chore | Non-feature maintenance: configs, dependencies, cleanup, tooling. | 6A737D |
| type: refactor | Code change that improves structure without changing behavior. | A371F7 |
| type: docs | Documentation updates (README, specs, diagrams, guides). | 0E8A16 |
| type: test | Adding/fixing tests, test setup, coverage improvements. | FBCA04 |
| type: spike | Time-boxed research/prototype to reduce uncertainty. | BFDADC |

### Priority Labels
| Label | Description | Color (Hex) |
| --- | --- | --- |
| prio: P0 | Critical for MVP / blockers. Must be done before launch. | B60205 |
| prio: P1 | High priority. Needed soon after P0 / core experience. | D93F0B |
| prio: P2 | Medium priority. Valuable but not urgent. | FBCA04 |
| prio: P3 | Low priority / future enhancement / nice-to-have. | 0E8A16 |

### Size Labels
| Label | Description | Color (Hex) |
| --- | --- | --- |
| size: XS | Tiny change; quick edit; minimal risk. (~1–2 pts) | EDEDED |
| size: S | Small; 1 screen or small backend function. (~3 pts) | D4D4D4 |
| size: M | Medium; multiple components, validation, edge cases. (~5 pts) | BDBDBD |
| size: L | Large; multi-step flow or multiple modules. (~8 pts) | 8F8F8F |
| size: XL | Very large; should be split into smaller issues. (~13+ pts) | 5A5A5A |

### Platform Labels
| Label | Description | Color (Hex) |
| --- | --- | --- |
| platform: mobile | Expo/React Native customer app work. | 2DA44E |
| platform: partner-web | Retail partner portal (web). | 0969DA |
| platform: admin-web | Admin dashboard (web). | 8250DF |
| platform: backend | Appwrite/cloud functions/DB rules/services/APIs. | 1F6FEB |
| platform: ops | Monitoring, alerts, runbooks, deployments, reliability. | 6E7781 |

### Area Labels (Customer)
| Label | Description | Color (Hex) |
| --- | --- | --- |
| area: auth | Signup/login/password reset/lockout/sessions. | 0E8A16 |
| area: search | Browse/search/filter/compare discovery flow. | 0969DA |
| area: cart | Cart add/remove/qty/save for later. | 1F6FEB |
| area: checkout | Address selection, payment step, confirmation. | D93F0B |
| area: order-tracking | Order status timeline, updates, tracking UX. | A371F7 |
| area: profile | Profile details, preferences, saved addresses. | 8250DF |
| area: reviews | Ratings/reviews for stores/products. | FBCA04 |
| area: support | Help center, tickets, contact, refunds handling UX. | 6A737D |
| area: subscriptions | Subscriptions/membership (if/when enabled). | 2DA44E |

### Area Labels (Partner)
| Label | Description | Color (Hex) |
| --- | --- | --- |
| area: partner-onboarding | Partner signup, verification, setup steps. | 0E8A16 |
| area: partner-products | Partner product creation/edit/catalog controls. | 0969DA |
| area: partner-orders | Partner order processing, pick/pack workflow. | D93F0B |
| area: partner-analytics | Sales dashboards, insights, reports for partners. | 8250DF |
| area: inventory | Stock levels, availability, item status. | 1F6FEB |
| area: pricing | Price changes, promos, fees, price rules. | FBCA04 |

### Area Labels (Admin & System)
| Label | Description | Color (Hex) |
| --- | --- | --- |
| area: admin-ops | Admin monitoring and operational controls. | 6A737D |
| area: partner-approval | Review/approve/disable partner accounts. | B60205 |
| area: admin-support | Admin tools for customer support actions. | D93F0B |
| area: reporting | Platform reports, exports, KPIs. | 8250DF |
| area: security | Security improvements, abuse prevention, policies. | B60205 |
| area: inventory-sync | Sync jobs, partner feeds, reconciliation. | 1F6FEB |
| area: routing | Delivery routing/assignment/ETA logic. | 0969DA |
| area: notifications | Email/SMS/push notifications and templates. | FBCA04 |
| area: analytics | Event tracking, funnels, instrumentation. | A371F7 |
| area: backup | Backups, restore tests, data retention. | 6E7781 |

### Actor Labels
| Label | Description | Color (Hex) |
| --- | --- | --- |
| actor: customer | Impacts end customers using Grovi. | 2DA44E |
| actor: partner | Impacts partner retailers/merchants. | 0969DA |
| actor: admin | Impacts internal admin team workflows. | 8250DF |
| actor: delivery-partner | Impacts drivers/couriers (when enabled). | D93F0B |

### Integration Labels
| Label | Description | Color (Hex) |
| --- | --- | --- |
| integration: sms | SMS verification, OTP, texting flows. | FBCA04 |
| integration: email | Email sending, templates, deliverability. | 0E8A16 |
| integration: payments | Payment gateway logic and webhooks. | 1F6FEB |
| integration: delivery | Delivery coordination/driver tracking integration. | 0969DA |
| integration: partner-apis | Retailer feeds/APIs/scrapers integrations. | A371F7 |
| integration: stripe | Stripe-specific tasks/config/webhooks. | 1D76DB |
| integration: indriver | inDrive-specific integration tasks. | D93F0B |
| integration: uber | Uber-related integration tasks. | 6F42C1 |

### NFR Labels
| Label | Description | Color (Hex) |
| --- | --- | --- |
| nfr: security | Auth hardening, rate limits, permissions, abuse prevention. | B60205 |
| nfr: performance | Speed, latency, load time, optimization work. | 0969DA |
| nfr: reliability | Retries, fallback, resilience, failure handling. | 6E7781 |
| nfr: observability | Logs/metrics/tracing/dashboards/alerts. | 5319E7 |
| nfr: compliance | Compliance/privacy/payment standards considerations. | 0E8A16 |

### Status Labels (Optional)
| Label | Description | Color (Hex) |
| --- | --- | --- |
| status: needs-triage | New issue; needs classification (type/prio/size/area). | BFDADC |
| status: blocked | Cannot proceed due to dependency or missing info. | B60205 |
| status: ready | Clear and actionable; ready to be picked up. | 0E8A16 |
| status: in-progress | Actively being worked on. | 0969DA |
| status: in-review | PR opened; awaiting review/testing/merge. | FBCA04 |

## Examples
1. **Secure Login (Email/Password + lockout + reset)**
   - Suggested labels: type: feature, prio: P0, size: S, platform: mobile, area: auth, actor: customer, nfr: security
2. **Checkout Payment Webhook Handling**
   - Suggested labels: type: feature, prio: P0, size: M, platform: backend, area: checkout, integration: payments, nfr: reliability
3. **Search Filters Performance Optimization**
   - Suggested labels: type: refactor, prio: P1, size: M, platform: backend, area: search, nfr: performance

## Governance
Keep labels stable. Only add new labels when there is repeated need. When a label is added, update this document and apply it consistently.
