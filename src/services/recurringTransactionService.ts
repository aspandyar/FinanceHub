import prisma from '../config/database.js';
import { TransactionModel } from '../models/models.js';
import { RecurringTransactionModel } from '../models/models.js';
import type { FrequencyType, TransactionType } from '../models/recurringTransaction.js';

export type EditScope = 'single' | 'future' | 'all';
export type DeleteScope = 'single' | 'future' | 'all';

/**
 * Calculate the next occurrence date based on frequency
 */
function calculateNextOccurrence(currentDate: Date, frequency: FrequencyType): Date {
  const next = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  
  return next;
}

/**
 * Get the previous day (for setting endDate)
 */
function getPreviousDay(date: Date): Date {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  return prev;
}

/**
 * Format a Date object to YYYY-MM-DD string without timezone conversion
 * This ensures the date string matches the local date, not the UTC date
 */
function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Edit a recurring transaction with scope support
 * 
 * @param recurringTransactionId - ID of the recurring transaction to edit
 * @param effectiveDate - The date from which the edit applies (YYYY-MM-DD)
 * @param scope - 'single' | 'future' | 'all'
 * @param updates - Fields to update
 */
export async function editRecurringTransaction(
  recurringTransactionId: string,
  effectiveDate: string,
  scope: EditScope,
  updates: {
    categoryId?: string;
    amount?: number;
    type?: TransactionType;
    description?: string | null;
    frequency?: FrequencyType;
    endDate?: string | null;
    isActive?: boolean;
  }
): Promise<{ recurringTransaction: any; newRecurringTransaction?: any }> {
  // Parse date string manually to avoid timezone issues
  // Format: YYYY-MM-DD
  const parts = effectiveDate.split('-').map(Number);
  if (parts.length !== 3 || !parts.every(p => !isNaN(p))) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;
  const effectiveDateObj = new Date(year, month - 1, day);
  effectiveDateObj.setHours(0, 0, 0, 0);
  
  const existing = await RecurringTransactionModel.getRecurringTransactionById(recurringTransactionId);
  if (!existing) {
    throw new Error('Recurring transaction not found');
  }

  // Normalize dates for comparison
  const startDate = new Date(existing.startDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = existing.endDate ? new Date(existing.endDate) : null;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  // Validate effective date is within the recurring transaction's range
  if (effectiveDateObj < startDate) {
    throw new Error('Effective date cannot be before the recurring transaction start date');
  }
  if (endDate && effectiveDateObj > endDate) {
    throw new Error('Effective date cannot be after the recurring transaction end date');
  }

  // Scenario 1: Edit ONLY THIS DATE (single occurrence)
  if (scope === 'single') {
    // Create an override transaction for this date
    // First, check if a transaction already exists for this date
    // Use date range to avoid timezone issues
    const startOfDay = new Date(effectiveDateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(effectiveDateObj);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        userId: existing.userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        recurringTransactionId: recurringTransactionId,
      },
    });

    const transactionData = {
      userId: existing.userId,
      categoryId: updates.categoryId || existing.categoryId,
      amount: updates.amount !== undefined ? updates.amount : Number(existing.amount),
      type: updates.type || existing.type,
      description: updates.description !== undefined ? updates.description : existing.description,
      date: effectiveDate, // Use the original date string to avoid timezone conversion issues
      recurringTransactionId: recurringTransactionId,
      isOverride: true,
    };

    if (existingTransaction) {
      // Update existing transaction
      await TransactionModel.updateTransaction(existingTransaction.id, transactionData);
    } else {
      // Create new override transaction
      await TransactionModel.createTransaction(transactionData);
    }

    // Return the original recurring transaction (unchanged)
    return {
      recurringTransaction: existing,
    };
  }

  // Scenario 2: Edit THIS + FUTURE (split series)
  if (scope === 'future') {
    // End the existing recurring transaction the day before effective date
    const previousDay = getPreviousDay(effectiveDateObj);
    
    await RecurringTransactionModel.updateRecurringTransaction(recurringTransactionId, {
      endDate: formatDateToString(previousDay),
    });

    // Create a new recurring transaction starting from effective date
    const newFrequency = updates.frequency || existing.frequency;
    const newNextOccurrence = calculateNextOccurrence(effectiveDateObj, newFrequency);

    const newRecurringTransaction = await RecurringTransactionModel.createRecurringTransaction({
      userId: existing.userId,
      categoryId: updates.categoryId || existing.categoryId,
      amount: updates.amount !== undefined ? updates.amount : Number(existing.amount),
      type: updates.type || existing.type,
      description: updates.description !== undefined ? updates.description : existing.description,
      frequency: newFrequency,
      startDate: effectiveDate, // Use the original date string to avoid timezone conversion issues
      endDate: updates.endDate || null,
      nextOccurrence: formatDateToString(newNextOccurrence),
      isActive: updates.isActive !== undefined ? updates.isActive : existing.isActive,
    });

    // Get the updated original recurring transaction
    const updatedOriginal = await RecurringTransactionModel.getRecurringTransactionById(recurringTransactionId);

    return {
      recurringTransaction: updatedOriginal!,
      newRecurringTransaction,
    };
  }

  // Scenario 3: Edit ENTIRE SERIES (all)
  if (scope === 'all') {
    // Simply update the existing recurring transaction
    const updateData: any = {};
    
    if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.frequency !== undefined) {
      updateData.frequency = updates.frequency;
      // Recalculate nextOccurrence if frequency changed
      const currentNext = new Date(existing.nextOccurrence);
      updateData.nextOccurrence = formatDateToString(calculateNextOccurrence(currentNext, updates.frequency));
    }
    if (updates.endDate !== undefined) updateData.endDate = updates.endDate;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const updated = await RecurringTransactionModel.updateRecurringTransaction(
      recurringTransactionId,
      updateData
    );

    return {
      recurringTransaction: updated!,
    };
  }

  throw new Error('Invalid scope');
}

/**
 * Delete a recurring transaction with scope support
 * 
 * @param recurringTransactionId - ID of the recurring transaction to delete
 * @param effectiveDate - The date from which the delete applies (YYYY-MM-DD)
 * @param scope - 'single' | 'future' | 'all'
 */
export async function deleteRecurringTransaction(
  recurringTransactionId: string,
  effectiveDate: string,
  scope: DeleteScope
): Promise<{ deleted: boolean; newRecurringTransaction?: any }> {
  // Parse date string manually to avoid timezone issues
  // Format: YYYY-MM-DD
  const parts = effectiveDate.split('-').map(Number);
  if (parts.length !== 3 || !parts.every(p => !isNaN(p))) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;
  const effectiveDateObj = new Date(year, month - 1, day);
  effectiveDateObj.setHours(0, 0, 0, 0);

  const existing = await RecurringTransactionModel.getRecurringTransactionById(recurringTransactionId);
  if (!existing) {
    throw new Error('Recurring transaction not found');
  }

  // Normalize dates for comparison
  const startDate = new Date(existing.startDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = existing.endDate ? new Date(existing.endDate) : null;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  // Validate effective date is within the recurring transaction's range
  if (effectiveDateObj < startDate) {
    throw new Error('Effective date cannot be before the recurring transaction start date');
  }
  if (endDate && effectiveDateObj > endDate) {
    throw new Error('Effective date cannot be after the recurring transaction end date');
  }

  // Scenario 1: Delete ONLY THIS DATE (single occurrence)
  if (scope === 'single') {
    // Find and delete any existing transaction for this date from this recurring series
    // Use date range to avoid timezone issues
    const startOfDay = new Date(effectiveDateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(effectiveDateObj);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        userId: existing.userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        recurringTransactionId: recurringTransactionId,
      },
    });

    if (existingTransaction) {
      // If transaction exists, delete it (it might be an override or generated)
      await TransactionModel.deleteTransaction(existingTransaction.id);
    }
    // If transaction doesn't exist yet, no action needed
    // The recurring generator will check for overrides before creating new transactions

    return { deleted: false }; // Original recurring transaction still exists
  }

  // Scenario 2: Delete THIS + FUTURE (end the series at previous day)
  if (scope === 'future') {
    const previousDay = getPreviousDay(effectiveDateObj);
    
    await RecurringTransactionModel.updateRecurringTransaction(recurringTransactionId, {
      endDate: formatDateToString(previousDay),
    });

    return { deleted: false }; // Original recurring transaction still exists but ended
  }

  // Scenario 3: Delete ENTIRE SERIES (all)
  if (scope === 'all') {
    await RecurringTransactionModel.deleteRecurringTransaction(recurringTransactionId);
    return { deleted: true };
  }

  throw new Error('Invalid scope');
}

/**
 * Find the next valid occurrence date starting from a given date
 * This handles cases where the current date is not a valid occurrence
 * 
 * @param currentDate - The date to start searching from
 * @param recurring - Recurring transaction details
 * @param maxIterations - Maximum number of iterations to prevent infinite loops (default: 100)
 * @returns The next valid occurrence date, or null if none found within limits
 */
function findNextValidOccurrence(
  currentDate: Date,
  recurring: {
    startDate: Date;
    endDate: Date | null;
    frequency: FrequencyType;
  },
  maxIterations: number = 100
): Date | null {
  let checkDate = new Date(currentDate);
  checkDate.setHours(0, 0, 0, 0);
  
  const startDate = new Date(recurring.startDate);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = recurring.endDate ? new Date(recurring.endDate) : null;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  // If current date is before start date, start from start date
  if (checkDate < startDate) {
    checkDate = new Date(startDate);
  }

  // If current date is after end date, no valid occurrence
  if (endDate && checkDate > endDate) {
    return null;
  }

  let iterations = 0;
  while (iterations < maxIterations) {
    // Check if current date is valid
    if (isDateValidOccurrence(checkDate, recurring)) {
      return checkDate;
    }

    // Move to next occurrence
    const nextDate = calculateNextOccurrence(checkDate, recurring.frequency);
    
    // Check if we've gone past the end date
    if (endDate && nextDate > endDate) {
      return null;
    }

    // Check if we're stuck (shouldn't happen, but safety check)
    if (nextDate <= checkDate) {
      return null;
    }

    checkDate = nextDate;
    iterations++;
  }

  // If we've exceeded max iterations, return null
  return null;
}

/**
 * Check if a date falls on a valid occurrence for a recurring transaction
 * based on its frequency and date range
 */
function isDateValidOccurrence(
  date: Date,
  recurring: {
    startDate: Date;
    endDate: Date | null;
    frequency: FrequencyType;
  }
): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  const startDate = new Date(recurring.startDate);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = recurring.endDate ? new Date(recurring.endDate) : null;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  // Check if date is within range
  if (checkDate < startDate) return false;
  if (endDate && checkDate > endDate) return false;

  // Check if date matches frequency pattern
  switch (recurring.frequency) {
    case 'daily':
      // Every day is valid
      return true;
    case 'weekly':
      // Check if it's the same day of week AND a multiple of 7 days from start
      if (checkDate.getDay() !== startDate.getDay()) return false;
      const daysDiff = Math.floor((checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff % 7 === 0;
    case 'monthly':
      // Check if it's the same day of month
      // Handle edge case where start date is the 31st and target month has fewer days
      const startDay = startDate.getDate();
      const checkDay = checkDate.getDate();
      
      // If start day is > 28, we need special handling for months with fewer days
      if (startDay > 28) {
        // For months with 30 days, use 30th; for months with 31 days, use 31st
        const lastDayOfMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();
        return checkDay === Math.min(startDay, lastDayOfMonth);
      }
      
      return checkDay === startDay;
    case 'yearly':
      // Check if it's the same month and day as start date
      // Handle leap year edge case (Feb 29)
      if (startDate.getMonth() === 1 && startDate.getDate() === 29) {
        // If start is Feb 29, check if target is Feb 28 or Feb 29 (depending on leap year)
        const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (checkDate.getMonth() === 1) {
          if (isLeapYear(checkDate.getFullYear())) {
            return checkDate.getDate() === 29;
          } else {
            return checkDate.getDate() === 28;
          }
        }
        return false;
      }
      return (
        checkDate.getMonth() === startDate.getMonth() &&
        checkDate.getDate() === startDate.getDate()
      );
    default:
      return false;
  }
}

/**
 * Process a single date for a recurring transaction
 * Returns whether a transaction was created or skipped, and the next occurrence date
 */
async function processDateForRecurring(
  date: Date,
  recurring: any,
  dateStr: string
): Promise<{ created: boolean; skipped: boolean; nextOccurrence: Date | null }> {
  // Check if this date is a valid occurrence for this recurring transaction
  const isValid = isDateValidOccurrence(date, {
    startDate: new Date(recurring.startDate),
    endDate: recurring.endDate ? new Date(recurring.endDate) : null,
    frequency: recurring.frequency,
  });

  // If date is invalid, find the next valid occurrence
  if (!isValid) {
    const nextValid = findNextValidOccurrence(date, {
      startDate: new Date(recurring.startDate),
      endDate: recurring.endDate ? new Date(recurring.endDate) : null,
      frequency: recurring.frequency,
    });
    return { created: false, skipped: true, nextOccurrence: nextValid };
  }

  // Check if an override transaction already exists for this date
  const existingOverride = await prisma.transaction.findFirst({
    where: {
      userId: recurring.userId,
      date: date,
      recurringTransactionId: recurring.id,
      isOverride: true,
    },
  });

  // If override exists, skip generation (override takes precedence)
  if (existingOverride) {
    const nextOccurrence = calculateNextOccurrence(date, recurring.frequency);
    return { created: false, skipped: true, nextOccurrence };
  }

  // Check if a transaction already exists (might have been generated before)
  const existingTransaction = await prisma.transaction.findFirst({
    where: {
      userId: recurring.userId,
      date: date,
      recurringTransactionId: recurring.id,
    },
  });

  // If transaction already exists (and it's not an override), skip
  if (existingTransaction) {
    const nextOccurrence = calculateNextOccurrence(date, recurring.frequency);
    return { created: false, skipped: true, nextOccurrence };
  }

  // Create the transaction
  try {
    await TransactionModel.createTransaction({
      userId: recurring.userId,
      categoryId: recurring.categoryId,
      amount: Number(recurring.amount),
      type: recurring.type,
      description: recurring.description,
      date: dateStr,
      recurringTransactionId: recurring.id,
      isOverride: false, // This is a generated transaction, not an override
    });

    const nextOccurrence = calculateNextOccurrence(date, recurring.frequency);
    return { created: true, skipped: false, nextOccurrence };
  } catch (error) {
    console.error(`Failed to create transaction for recurring ${recurring.id}:`, error);
    const nextOccurrence = calculateNextOccurrence(date, recurring.frequency);
    return { created: false, skipped: true, nextOccurrence };
  }
}

/**
 * Generate transactions from recurring transactions for a specific date
 * This is the core function that should be called by a cron job or scheduler
 * 
 * Implements catch-up mechanism: processes all valid dates from nextOccurrence to targetDate
 * Implements invalid date handling: advances nextOccurrence past invalid dates
 * 
 * @param targetDate - The date to generate transactions for (YYYY-MM-DD), defaults to today
 * @param maxCatchUpDays - Maximum number of days to catch up (default: 365) to prevent excessive processing
 * @returns Number of transactions created and skipped
 */
export async function generateTransactionsFromRecurring(
  targetDate?: string,
  maxCatchUpDays: number = 365
): Promise<{ created: number; skipped: number }> {
  let target: Date;
  if (targetDate) {
    // Parse date string manually to avoid timezone issues
    const parts = targetDate.split('-').map(Number);
    if (parts.length !== 3 || !parts.every(p => !isNaN(p))) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    const year = parts[0]!;
    const month = parts[1]!;
    const day = parts[2]!;
    target = new Date(year, month - 1, day);
    target.setHours(0, 0, 0, 0);
  } else {
    target = new Date();
    target.setHours(0, 0, 0, 0);
  }
  
  const targetStr = formatDateToString(target);

  // Find all active recurring transactions that are due on or before this date
  const dueRecurring = await RecurringTransactionModel.getDueRecurringTransactions(targetStr);
  
  let created = 0;
  let skipped = 0;

  for (const recurring of dueRecurring) {
    // Skip if not active
    if (!recurring.isActive) {
      skipped++;
      continue;
    }

    const recurringStartDate = new Date(recurring.startDate);
    recurringStartDate.setHours(0, 0, 0, 0);
    const recurringEndDate = recurring.endDate ? new Date(recurring.endDate) : null;
    if (recurringEndDate) recurringEndDate.setHours(23, 59, 59, 999);

    // Get the current nextOccurrence
    let currentDate = new Date(recurring.nextOccurrence);
    currentDate.setHours(0, 0, 0, 0);

    // Determine the effective end date (target date or recurring end date, whichever is earlier)
    const effectiveEndDate = recurringEndDate && recurringEndDate < target 
      ? recurringEndDate 
      : target;

    // If currentDate is after effectiveEndDate, skip this recurring transaction
    if (currentDate > effectiveEndDate) {
      skipped++;
      continue;
    }

    // SOLUTION 3: Fix invalid date handling - ensure we start from a valid date
    // If the initial nextOccurrence is invalid, find the next valid occurrence
    if (!isDateValidOccurrence(currentDate, {
      startDate: recurringStartDate,
      endDate: recurringEndDate,
      frequency: recurring.frequency,
    })) {
      const nextValid = findNextValidOccurrence(currentDate, {
        startDate: recurringStartDate,
        endDate: recurringEndDate,
        frequency: recurring.frequency,
      });
      
      if (!nextValid || nextValid > effectiveEndDate) {
        // No valid occurrence found or it's after the effective end date
        // Update nextOccurrence to the calculated next date (even if invalid, it will be handled next time)
        const calculatedNext = calculateNextOccurrence(currentDate, recurring.frequency);
        await RecurringTransactionModel.updateRecurringTransaction(recurring.id, {
          nextOccurrence: formatDateToString(calculatedNext),
        });
        skipped++;
        continue;
      }
      
      currentDate = nextValid;
      currentDate.setHours(0, 0, 0, 0);
    }

    // SOLUTION 1: Catch-up mechanism
    // If nextOccurrence is before targetDate, process all dates from nextOccurrence to targetDate
    let lastProcessedDate: Date | null = null;
    let processedCount = 0;
    const maxProcessDates = maxCatchUpDays; // Safety limit

    // Process all dates from currentDate to effectiveEndDate (inclusive)
    while (currentDate <= effectiveEndDate && processedCount < maxProcessDates) {
      // Check if we've exceeded the recurring transaction's end date
      if (recurringEndDate && currentDate > recurringEndDate) {
        break;
      }

      // Check if currentDate is before startDate (shouldn't happen, but safety check)
      if (currentDate < recurringStartDate) {
        currentDate = new Date(recurringStartDate);
        currentDate.setHours(0, 0, 0, 0);
      }

      const dateStr = formatDateToString(currentDate);
      const result = await processDateForRecurring(currentDate, recurring, dateStr);

      if (result.created) {
        created++;
        lastProcessedDate = currentDate;
      } else {
        skipped++;
      }

      // SOLUTION 3: Fix invalid date handling
      // Advance to next occurrence (result.nextOccurrence handles invalid dates)
      if (result.nextOccurrence) {
        currentDate = result.nextOccurrence;
        currentDate.setHours(0, 0, 0, 0);
      } else {
        // No more valid occurrences (e.g., past end date)
        break;
      }

      processedCount++;

      // Safety check: prevent infinite loops
      if (processedCount >= maxProcessDates) {
        console.warn(
          `Reached max catch-up limit (${maxProcessDates}) for recurring transaction ${recurring.id}. ` +
          `Stopped at date ${currentDate.toISOString().split('T')[0]}. ` +
          `Consider running catch-up manually for this transaction.`
        );
        break;
      }
    }

    // Update nextOccurrence to the date after the last processed date
    // Ensure the stored nextOccurrence is always valid
    let nextOccurrenceToStore: Date | null = null;
    
    if (lastProcessedDate) {
      // Calculate next occurrence from the last processed date
      const calculatedNext = calculateNextOccurrence(lastProcessedDate, recurring.frequency);
      // Ensure it's valid, or find the next valid one
      if (isDateValidOccurrence(calculatedNext, {
        startDate: recurringStartDate,
        endDate: recurringEndDate,
        frequency: recurring.frequency,
      })) {
        nextOccurrenceToStore = calculatedNext;
      } else {
        // Find the next valid occurrence
        const nextValid = findNextValidOccurrence(calculatedNext, {
          startDate: recurringStartDate,
          endDate: recurringEndDate,
          frequency: recurring.frequency,
        });
        nextOccurrenceToStore = nextValid;
      }
    } else if (processedCount > 0) {
      // We processed dates but didn't create any transactions (all skipped)
      // currentDate has been advanced past processed dates
      // Ensure it's valid
      if (isDateValidOccurrence(currentDate, {
        startDate: recurringStartDate,
        endDate: recurringEndDate,
        frequency: recurring.frequency,
      })) {
        nextOccurrenceToStore = currentDate;
      } else {
        // Find the next valid occurrence
        const nextValid = findNextValidOccurrence(currentDate, {
          startDate: recurringStartDate,
          endDate: recurringEndDate,
          frequency: recurring.frequency,
        });
        nextOccurrenceToStore = nextValid;
      }
    } else if (currentDate <= effectiveEndDate) {
      // We didn't process any dates (currentDate was already after effectiveEndDate or invalid)
      // This case should be rare, but ensure nextOccurrence is updated if needed
      // currentDate should already be valid from the initial validation
      if (currentDate.getTime() !== new Date(recurring.nextOccurrence).getTime()) {
        if (isDateValidOccurrence(currentDate, {
          startDate: recurringStartDate,
          endDate: recurringEndDate,
          frequency: recurring.frequency,
        })) {
          nextOccurrenceToStore = currentDate;
        } else {
          const nextValid = findNextValidOccurrence(currentDate, {
            startDate: recurringStartDate,
            endDate: recurringEndDate,
            frequency: recurring.frequency,
          });
          nextOccurrenceToStore = nextValid;
        }
      }
    }
    
    // Update nextOccurrence if we have a value to store
    if (nextOccurrenceToStore) {
      await RecurringTransactionModel.updateRecurringTransaction(recurring.id, {
        nextOccurrence: formatDateToString(nextOccurrenceToStore),
      });
    }
    // If nextOccurrenceToStore is null, it means there are no more valid occurrences
    // (e.g., past end date), so we don't update nextOccurrence
  }

  return { created, skipped };
}

/**
 * Get effective transactions for a date range
 * This combines real transactions with generated recurring instances,
 * respecting overrides (overrides take precedence over generated instances)
 * 
 * @param userId - User ID to get transactions for
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of effective transactions
 */
export async function getEffectiveTransactions(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  // Get all real transactions in the date range
  const realTransactions = await TransactionModel.getAllTransactions(
    userId,
    undefined,
    undefined,
    startDate,
    endDate
  );

  // Get all active recurring transactions for this user
  const recurringTransactions = await RecurringTransactionModel.getAllRecurringTransactions(
    userId,
    true // Only active
  );

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);

  const effectiveTransactions: any[] = [...realTransactions];

  // For each recurring transaction, generate instances for the date range
  for (const recurring of recurringTransactions) {
    const recurringStart = new Date(recurring.startDate);
    recurringStart.setHours(0, 0, 0, 0);
    const recurringEnd = recurring.endDate ? new Date(recurring.endDate) : null;
    if (recurringEnd) recurringEnd.setHours(23, 59, 59, 999);

    // Determine the date range to check
    const rangeStart = start && start > recurringStart ? start : recurringStart;
    const rangeEnd = end && (!recurringEnd || end < recurringEnd) ? end : (recurringEnd || new Date());

    // Find the first valid occurrence date (might be before rangeStart)
    let currentDate = new Date(recurringStart);
    
    // If rangeStart is after recurringStart, find the first valid occurrence >= rangeStart
    if (rangeStart > recurringStart) {
      // For daily, just use rangeStart
      if (recurring.frequency === 'daily') {
        currentDate = new Date(rangeStart);
      } else {
        // For other frequencies, find the first valid occurrence
        // Start from the recurring start date and iterate until we find a valid date >= rangeStart
        currentDate = new Date(recurringStart);
        while (currentDate < rangeStart) {
          const next = calculateNextOccurrence(currentDate, recurring.frequency);
          if (next > rangeEnd) break; // No more occurrences in range
          currentDate = next;
        }
        // Now check if currentDate is valid and >= rangeStart
        if (currentDate < rangeStart || !isDateValidOccurrence(currentDate, {
          startDate: new Date(recurring.startDate),
          endDate: recurring.endDate ? new Date(recurring.endDate) : null,
          frequency: recurring.frequency,
        })) {
          // Move to next occurrence
          currentDate = calculateNextOccurrence(currentDate, recurring.frequency);
        }
      }
    }

    // Generate dates based on frequency
    while (currentDate <= rangeEnd) {
      // Check if this date is a valid occurrence
      if (isDateValidOccurrence(currentDate, {
        startDate: new Date(recurring.startDate),
        endDate: recurring.endDate ? new Date(recurring.endDate) : null,
        frequency: recurring.frequency,
      })) {
        const dateStr = formatDateToString(currentDate);

        // Check if an override exists for this date
        const hasOverride = realTransactions.some(
          t => {
            const tDate = t.date instanceof Date ? t.date : new Date(t.date);
            return tDate.toISOString().split('T')[0] === dateStr &&
                   t.recurringTransactionId === recurring.id &&
                   t.isOverride;
          }
        );

        // Check if a generated transaction already exists
        const hasGenerated = realTransactions.some(
          t => {
            const tDate = t.date instanceof Date ? t.date : new Date(t.date);
            return tDate.toISOString().split('T')[0] === dateStr &&
                   t.recurringTransactionId === recurring.id &&
                   !t.isOverride;
          }
        );

        // Only add if no override and no generated transaction exists
        if (!hasOverride && !hasGenerated) {
          effectiveTransactions.push({
            id: `recurring-${recurring.id}-${dateStr}`,
            userId: recurring.userId,
            categoryId: recurring.categoryId,
            amount: recurring.amount,
            type: recurring.type,
            description: recurring.description,
            date: new Date(dateStr),
            recurringTransactionId: recurring.id,
            isOverride: false,
            createdAt: recurring.createdAt,
            updatedAt: recurring.createdAt,
            // Include relations for consistency
            category: null, // Would need to fetch if needed
            recurringTransaction: null, // Would need to fetch if needed
          });
        }
      }

      // Move to next occurrence based on frequency
      const nextDate = calculateNextOccurrence(currentDate, recurring.frequency);
      if (nextDate <= currentDate) break; // Prevent infinite loop
      currentDate = nextDate;
    }
  }

  // Sort by date
  effectiveTransactions.sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  return effectiveTransactions;
}
