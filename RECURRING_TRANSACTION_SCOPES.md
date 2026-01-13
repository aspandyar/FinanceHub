# Recurring Transaction Update & Delete - All Scopes Documentation

This document explains how PUT (update) and DELETE operations work for all 3 scopes: `single`, `future`, and `all`.

---

## 📝 PUT (Update) Operations

### **Scenario 1: PUT with `scope='single'`** 
**Edit ONLY THIS OCCURRENCE**

#### Request Format
```http
PUT /api/recurring-transactions/:id
Content-Type: application/json

{
  "scope": "single",
  "effectiveDate": "2026-01-15",  // The date to edit (YYYY-MM-DD)
  "amount": 150,                    // Optional: new amount
  "categoryId": "cat-123",          // Optional: new category
  "type": "expense",                // Optional: new type
  "description": "Updated desc"    // Optional: new description
}
```

#### What Happens
1. ✅ **RecurringTransaction** remains **UNCHANGED**
2. ✅ Creates or updates a **Transaction** with:
   - `date` = `effectiveDate`
   - `recurringTransactionId` = the recurring transaction ID
   - `isOverride` = `true`
   - Uses provided values or falls back to recurring transaction defaults

#### Database Changes
- **RecurringTransaction table**: No changes
- **Transaction table**: 
  - Creates new transaction OR updates existing transaction for that date
  - Sets `isOverride = true`
  - Links to recurring transaction via `recurringTransactionId`

#### Response
```json
{
  "message": "Override transaction created/updated for this occurrence. Recurring transaction unchanged.",
  "recurringTransaction": { /* original recurring transaction */ },
  "effectiveDate": "2026-01-15"
}
```

#### Example
**Before:**
- Recurring: Daily income $100, starts 2026-01-01
- Jan 15: Generated transaction $100

**Request:** `PUT /api/recurring-transactions/abc123` with `scope='single'`, `effectiveDate='2026-01-15'`, `amount=50`

**After:**
- Recurring: Still daily income $100 (unchanged)
- Jan 15: Override transaction $50 (`isOverride=true`)
- Jan 16: Will still generate $100 (recurring unchanged)

---

### **Scenario 2: PUT with `scope='future'`**
**Edit THIS + ALL FUTURE OCCURRENCES**

#### Request Format
```http
PUT /api/recurring-transactions/:id
Content-Type: application/json

{
  "scope": "future",
  "effectiveDate": "2026-01-15",  // Date from which changes apply
  "amount": 150,                    // New amount for future
  "categoryId": "cat-456",          // New category for future
  "frequency": "weekly",            // Optional: can change frequency
  "endDate": "2026-12-31",          // Optional: new end date
  "isActive": true                  // Optional: active status
}
```

#### What Happens
1. ✅ **Original RecurringTransaction**:
   - `endDate` is set to `effectiveDate - 1 day` (ends the day before)
2. ✅ **New RecurringTransaction** is created:
   - `startDate` = `effectiveDate`
   - Uses provided values or falls back to original values
   - `nextOccurrence` is calculated based on new frequency

#### Database Changes
- **RecurringTransaction table**:
  - Original record: `endDate` updated to day before effective date
  - New record: Created with new values, starting from effective date
- **Transaction table**: No immediate changes (future transactions will use new recurring)

#### Response
```json
{
  "message": "Recurring transaction updated. Series split into two.",
  "original": { /* original recurring transaction (now ended) */ },
  "new": { /* new recurring transaction (starting from effectiveDate) */ }
}
```

#### Example
**Before:**
- Recurring: Daily income $100, starts 2026-01-01, no end date
- Jan 1-14: Generated transactions $100 each

**Request:** `PUT /api/recurring-transactions/abc123` with `scope='future'`, `effectiveDate='2026-01-15'`, `amount=150`

**After:**
- Original Recurring: Daily income $100, ends 2026-01-14
- New Recurring: Daily income $150, starts 2026-01-15, no end date
- Jan 1-14: Still $100 each (past data unchanged)
- Jan 15+: Will generate $150 each (new recurring)

---

### **Scenario 3: PUT with `scope='all'`**
**Edit ENTIRE SERIES (Past + Present + Future)**

#### Request Format
```http
PUT /api/recurring-transactions/:id
Content-Type: application/json

{
  "scope": "all",
  "effectiveDate": "2026-01-15",  // Required but not used for 'all' scope
  "amount": 150,                    // New amount for entire series
  "categoryId": "cat-789",          // New category for entire series
  "frequency": "weekly",            // Optional: can change frequency
  "endDate": "2026-12-31",          // Optional: new end date
  "isActive": false                 // Optional: can deactivate
}
```

#### What Happens
1. ✅ **RecurringTransaction** is updated directly:
   - All provided fields are updated
   - If `frequency` changes, `nextOccurrence` is recalculated
   - No splitting occurs

#### Database Changes
- **RecurringTransaction table**: 
  - Single record updated with new values
- **Transaction table**: 
  - No changes to existing transactions
  - Future transactions will use new values when generated

#### Response
```json
{
  "message": "Entire recurring transaction series updated.",
  "recurringTransaction": { /* updated recurring transaction */ }
}
```

#### Example
**Before:**
- Recurring: Daily income $100, starts 2026-01-01
- Jan 1-14: Generated transactions $100 each

**Request:** `PUT /api/recurring-transactions/abc123` with `scope='all'`, `amount=150`

**After:**
- Recurring: Daily income $150 (entire series updated)
- Jan 1-14: Still $100 each (past transactions unchanged - this is correct!)
- Jan 15+: Will generate $150 each (future uses new value)

> **Note:** Past transactions are NOT modified. This is intentional - historical data should remain immutable. Only future generated transactions will use the new values.

---

## 🗑️ DELETE Operations

### **Scenario 4: DELETE with `scope='single'`**
**Delete ONLY THIS OCCURRENCE**

#### Request Format
```http
DELETE /api/recurring-transactions/:id
Content-Type: application/json

{
  "scope": "single",
  "effectiveDate": "2026-01-15"  // The date to delete (YYYY-MM-DD)
}
```

#### What Happens
1. ✅ Finds any existing **Transaction** for that date with this recurring ID
2. ✅ Deletes that transaction (if it exists)
3. ✅ **RecurringTransaction** remains **UNCHANGED** and **ACTIVE**

#### Database Changes
- **RecurringTransaction table**: No changes
- **Transaction table**: 
  - Deletes transaction for that specific date (if exists)
  - If transaction doesn't exist yet, nothing happens (generator will skip it)

#### Response
```json
{
  "message": "Occurrence deleted. Recurring transaction still active.",
  "recurringTransaction": { /* unchanged recurring transaction */ }
}
```

#### Example
**Before:**
- Recurring: Daily income $100, starts 2026-01-01
- Jan 15: Generated transaction $100

**Request:** `DELETE /api/recurring-transactions/abc123` with `scope='single'`, `effectiveDate='2026-01-15'`

**After:**
- Recurring: Still active, unchanged
- Jan 15: Transaction deleted (or won't be generated)
- Jan 16: Will still generate $100 (recurring still active)

---

### **Scenario 5: DELETE with `scope='future'`**
**Delete THIS + ALL FUTURE OCCURRENCES**

#### Request Format
```http
DELETE /api/recurring-transactions/:id
Content-Type: application/json

{
  "scope": "future",
  "effectiveDate": "2026-01-15"  // Date from which to stop (YYYY-MM-DD)
}
```

#### What Happens
1. ✅ **RecurringTransaction**:
   - `endDate` is set to `effectiveDate - 1 day`
   - Recurring transaction still exists but is now ended

#### Database Changes
- **RecurringTransaction table**: 
  - `endDate` updated to day before effective date
- **Transaction table**: 
  - No immediate changes
  - Future transactions won't be generated (recurring ended)

#### Response
```json
{
  "message": "Future occurrences deleted. Recurring transaction ended.",
  "recurringTransaction": { /* recurring transaction with endDate set */ }
}
```

#### Example
**Before:**
- Recurring: Daily income $100, starts 2026-01-01, no end date
- Jan 1-14: Generated transactions $100 each

**Request:** `DELETE /api/recurring-transactions/abc123` with `scope='future'`, `effectiveDate='2026-01-15'`

**After:**
- Recurring: Daily income $100, ends 2026-01-14 (ended)
- Jan 1-14: Still $100 each (past unchanged)
- Jan 15+: No more transactions generated (recurring ended)

---

### **Scenario 6: DELETE with `scope='all'`**
**Delete ENTIRE SERIES**

#### Request Format
```http
DELETE /api/recurring-transactions/:id
Content-Type: application/json

{
  "scope": "all",
  "effectiveDate": "2026-01-15"  // Required but not used for 'all' scope
}
```

#### What Happens
1. ✅ **RecurringTransaction** is completely deleted
2. ✅ Related transactions remain (they're not deleted)

#### Database Changes
- **RecurringTransaction table**: 
  - Record deleted
- **Transaction table**: 
  - Transactions remain (they're not deleted)
  - `recurringTransactionId` is set to `NULL` (due to `onDelete: SetNull` in schema)

#### Response
```http
204 No Content
```

#### Example
**Before:**
- Recurring: Daily income $100, starts 2026-01-01
- Jan 1-14: Generated transactions $100 each

**Request:** `DELETE /api/recurring-transactions/abc123` with `scope='all'`

**After:**
- Recurring: **DELETED**
- Jan 1-14: Transactions still exist but `recurringTransactionId = NULL`
- Jan 15+: No more transactions generated (recurring deleted)

---

## 📊 Summary Table

| Scope | Operation | RecurringTransaction | Transactions | Result |
|-------|-----------|---------------------|--------------|--------|
| `single` | PUT | Unchanged | Creates/updates override for that date | Override takes precedence |
| `future` | PUT | Split: original ends, new created | No immediate change | Future uses new recurring |
| `all` | PUT | Updated in place | No immediate change | Future uses new values |
| `single` | DELETE | Unchanged | Deletes transaction for that date | Recurring still active |
| `future` | DELETE | `endDate` set to day before | No immediate change | Recurring ended |
| `all` | DELETE | Deleted | Remain but `recurringTransactionId = NULL` | Series completely removed |

---

## 🔑 Key Principles

1. **Past transactions are immutable** - Editing/deleting recurring transactions does NOT modify past generated transactions
2. **Overrides take precedence** - When `scope='single'`, an override transaction is created that takes precedence over the recurring definition
3. **Series splitting** - When `scope='future'`, the series is split into two: original (ended) + new (starting from effective date)
4. **Historical accuracy** - Past data remains accurate; only future behavior changes
5. **Transaction generation** - The generator respects overrides and won't create duplicates

---

## 🚨 Important Notes

- **`effectiveDate` is required** for all scopes (even though it's not used for `scope='all'`)
- **`effectiveDate` must be within** the recurring transaction's date range (between `startDate` and `endDate`)
- **Past transactions are never modified** - this is intentional for data integrity
- **When deleting with `scope='all'`**, the recurring transaction is deleted but existing transactions remain (they just lose their link to the recurring transaction)
