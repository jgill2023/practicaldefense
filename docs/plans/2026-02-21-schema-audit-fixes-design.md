# Schema Audit Fixes — Design Document

**Date:** 2026-02-21
**Scope:** shared/schema.ts modifications only (db:push deployment)

## Problem

Database schema audit identified 15+ issues across severity levels: missing indexes on all high-traffic tables, no admin audit log, hardcoded tax rates, missing soft delete support, missing unique constraints, and dead/duplicate columns.

## Approach

Single-pass edit of `shared/schema.ts` with all additive changes. No column removals, no enum conversions, no table consolidation. User runs `db:push` to apply.

## Changes

### 1. Indexes (30+ new indexes across 13 tables)

**courses:** instructorId, status, deletedAt, showOnHomePage
**enrollments:** studentId, courseId, scheduleId, status, paymentStatus
**courseSchedules:** courseId, startDate, deletedAt
**instructorAppointments:** instructorId, studentId, status, startTime
**communications:** userId, type, isRead
**users:** role, userStatus
**courseNotificationSignups:** courseId, email
**notificationLogs:** recipientId, status
**giftCards:** status, hashedCode
**waitlist:** studentId, scheduleId
**merchOrders:** userId, status
**ecommerceOrders:** userId, status
**onlineCourseEnrollments:** userId, status, email

### 2. New Tables

**adminActionLog** — General-purpose admin action audit trail
- adminId (FK users), action, targetTable, targetId, oldValue (jsonb), newValue (jsonb), reason, ipAddress, createdAt
- Relations, insert schema, types

**taxConfiguration** — Configurable tax rates (replaces hardcoded NM_GRT_RATE)
- name, state, rate (decimal 6,5), appliesTo (text array), isDefault, isActive, effectiveDate
- Relations, insert schema, types

**venues** — Normalized range/classroom locations
- name, type (range/classroom/both), address, city, state, zipCode, googleMapsLink, locationImageUrl, contactPhone, notes, isActive
- Relations, insert schema, types

### 3. New Columns

- `users.deletedAt` (timestamp) — soft delete support
- `products.deletedAt` (timestamp) — preserve order history refs
- `cartItems.expiresAt` (timestamp) — abandoned cart cleanup
- `appSettings.defaultTaxRate` (decimal 6,5) — fallback tax rate

### 4. Unique Constraints

- `courseNotificationSignups` — unique(courseId, email)
- `smsListMembers` — unique(listId, userId)

### 5. Deprecation Comments

- `enrollments.paymentIntentId` — mark DEPRECATED (duped by stripePaymentIntentId)
- `instructorAppointments.paymentIntentId` — mark DEPRECATED
- `courses.category` (varchar) — mark DEPRECATED (replaced by categoryId FK)

## Excluded (intentional)

- VARCHAR→enum conversions (could fail with existing data)
- Column removals (could break code)
- Merch/ecommerce order consolidation (refactoring scope)
- User.id VARCHAR→UUID migration (cascading FK impact)
- Notification system consolidation (refactoring scope)

## Risks

- Unique constraints on courseNotificationSignups/smsListMembers could fail if duplicates exist. Deduplicate before db:push if needed.
- All other changes are purely additive (new indexes, tables, columns) and cannot break existing functionality.
