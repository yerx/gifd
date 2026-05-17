// ---------------------------------------------------------------------------
// Feature 77: NLP Time Estimate Parser
// ---------------------------------------------------------------------------

export function parseTimeEstimate(text: string): number | null {
  if (!text) return null;

  // Patterns to match time estimates:
  // ~45min, ~2h, est 2 hours, about 30 minutes, takes 1h, ~30m, 45min, 2 hours, 30 minutes, 1h30m
  const patterns = [
    // "~2h30m" or "~2h 30m"
    /(?:~|about|est(?:imated)?|takes|approx(?:imately)?)\s*(\d+)\s*h(?:(?:ours?|rs?)?)\s*(\d+)\s*m(?:in(?:utes?)?)?/i,
    // "2h30m" or "2h 30m" (without prefix)
    /(\d+)\s*h(?:(?:ours?|rs?)?)\s*(\d+)\s*m(?:in(?:utes?)?)?/i,
    // "~2 hours" or "est 2 hours" or "about 2h"
    /(?:~|about|est(?:imated)?|takes|approx(?:imately)?)\s*(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?(?!\s*\d)/i,
    // "~45min" or "about 30 minutes" or "est 45m"
    /(?:~|about|est(?:imated)?|takes|approx(?:imately)?)\s*(\d+)\s*m(?:in(?:utes?)?)?/i,
    // Standalone with tilde: "~2h", "~30m"
    /~\s*(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?(?!\s*\d)/i,
    /~\s*(\d+)\s*m(?:in(?:utes?)?)?/i,
    // Bare patterns without prefix: "2 hours", "45min", "30 minutes", "1h"
    /(\d+(?:\.\d+)?)\s*hours?/i,
    /(\d+)\s*min(?:utes?)?/i,
    /(\d+(?:\.\d+)?)\s*h(?:rs?)?(?!\s*\d)/i,
    /(\d+)\s*m(?:in)?(?:\b|$)/i,
  ];

  // Try compound patterns first (hours + minutes)
  for (let i = 0; i < 2; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      const hours = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      return hours * 60 + mins;
    }
  }

  // Try hour patterns (with prefix)
  const hourPrefixMatch = text.match(patterns[2]);
  if (hourPrefixMatch) {
    return Math.round(parseFloat(hourPrefixMatch[1]) * 60);
  }

  // Try minute patterns (with prefix)
  const minPrefixMatch = text.match(patterns[3]);
  if (minPrefixMatch) {
    return parseInt(minPrefixMatch[1], 10);
  }

  // Try tilde patterns
  const tildeHourMatch = text.match(patterns[4]);
  if (tildeHourMatch) {
    return Math.round(parseFloat(tildeHourMatch[1]) * 60);
  }
  const tildeMinMatch = text.match(patterns[5]);
  if (tildeMinMatch) {
    return parseInt(tildeMinMatch[1], 10);
  }

  // Try bare hour/minute patterns
  const bareHourMatch = text.match(patterns[6]);
  if (bareHourMatch) {
    return Math.round(parseFloat(bareHourMatch[1]) * 60);
  }
  const bareMinMatch = text.match(patterns[7]);
  if (bareMinMatch) {
    return parseInt(bareMinMatch[1], 10);
  }

  // "1h" bare
  const bareHShort = text.match(patterns[8]);
  if (bareHShort) {
    return Math.round(parseFloat(bareHShort[1]) * 60);
  }

  // "30m" bare
  const bareMShort = text.match(patterns[9]);
  if (bareMShort) {
    return parseInt(bareMShort[1], 10);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Feature 78: NLP Due Date Parser
// ---------------------------------------------------------------------------

export function parseDueDate(text: string): string | null {
  if (!text) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lowerText = text.toLowerCase();

  // "today"
  if (/\b(?:due\s+)?today\b/i.test(lowerText)) {
    return formatDateStr(today);
  }

  // "tomorrow"
  if (/\b(?:due\s+)?tomorrow\b/i.test(lowerText)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return formatDateStr(d);
  }

  // "due in X days" / "in X days"
  const inDaysMatch = lowerText.match(/(?:due\s+)?in\s+(\d+)\s+days?/i);
  if (inDaysMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() + parseInt(inDaysMatch[1], 10));
    return formatDateStr(d);
  }

  // "next week"
  if (/\bnext\s+week\b/i.test(lowerText)) {
    const d = new Date(today);
    const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + daysUntilMonday);
    return formatDateStr(d);
  }

  // "next Monday", "next Tuesday", etc.
  const nextDayMatch = lowerText.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (nextDayMatch) {
    const targetDay = dayNameToNumber(nextDayMatch[1]);
    if (targetDay !== null) {
      const d = new Date(today);
      const currentDay = d.getDay();
      let daysAhead = targetDay - currentDay;
      if (daysAhead <= 0) daysAhead += 7;
      // "next" always means at least 7 days out if the day hasn't passed, or the next occurrence
      if (daysAhead <= 0) daysAhead += 7;
      d.setDate(d.getDate() + daysAhead);
      return formatDateStr(d);
    }
  }

  // "due Friday", "by Friday", "due on Monday"
  const dueDayMatch = lowerText.match(/(?:due|by)\s+(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (dueDayMatch) {
    const targetDay = dayNameToNumber(dueDayMatch[1]);
    if (targetDay !== null) {
      const d = new Date(today);
      const currentDay = d.getDay();
      let daysAhead = targetDay - currentDay;
      if (daysAhead <= 0) daysAhead += 7;
      d.setDate(d.getDate() + daysAhead);
      return formatDateStr(d);
    }
  }

  // "by March 15" or "due March 15" or "by March 15th" or "due Mar 15"
  const monthDayMatch = lowerText.match(/(?:due|by)\s+(?:on\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
  if (monthDayMatch) {
    const monthNum = monthNameToNumber(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2], 10);
    if (monthNum !== null) {
      const d = new Date(today.getFullYear(), monthNum, day);
      // If the date has passed this year, move to next year
      if (d < today) {
        d.setFullYear(d.getFullYear() + 1);
      }
      return formatDateStr(d);
    }
  }

  return null;
}

export function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayNameToNumber(name: string): number | null {
  const days: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  return days[name.toLowerCase()] ?? null;
}

function monthNameToNumber(name: string): number | null {
  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };
  return months[name.toLowerCase()] ?? null;
}

export function formatDueDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === formatDateStr(today)) return 'Today';
  if (dateStr === formatDateStr(tomorrow)) return 'Tomorrow';

  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Feature 115: First Sentence Extractor for Voice Items
// ---------------------------------------------------------------------------

export function getFirstSentence(text: string): string {
  if (!text) return '';
  // Split on sentence-ending punctuation
  const match = text.match(/^[^.!?]+[.!?]?/);
  if (match) {
    return match[0].trim();
  }
  // If no punctuation, take up to 80 characters
  return text.substring(0, 80).trim();
}

// ---------------------------------------------------------------------------
// Feature 76: Batch Processing Helpers
// ---------------------------------------------------------------------------

import type { InboxItemData, BatchGroup } from './types';

export function groupItemsByType(items: InboxItemData[]): BatchGroup[] {
  const map = new Map<string, InboxItemData[]>();
  for (const item of items) {
    const key = item.type || 'text';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([type, items]) => ({ type, items }));
}
