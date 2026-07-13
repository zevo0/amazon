/* =========================================================
   أمازون شاليه — Time formatting helper
   Converts 24h "HH:MM" start/end times into the Arabic
   period-of-day label style used across the site, e.g.:
     08:00 -> ٨ص      (صباحًا)
     13:00 -> ١ظ      (ظهرًا)
     16:00 -> ٤ع      (عصرًا)
     22:00 -> ١٠م     (مساءً)
   ========================================================= */

const ARABIC_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];

function toArabicNumerals(num) {
  return String(num).split('').map(ch => (ch >= '0' && ch <= '9') ? ARABIC_DIGITS[+ch] : ch).join('');
}

function periodSuffixFor(hour24) {
  if (hour24 >= 5 && hour24 < 12) return 'ص';   // صباحًا
  if (hour24 >= 12 && hour24 < 15) return 'ظ';  // ظهرًا
  if (hour24 >= 15 && hour24 < 18) return 'ع';  // عصرًا
  return 'م';                                    // مساءً / ليلاً
}

function formatArabicTime(hhmm) {
  if (!hhmm) return '';
  const [hStr] = hhmm.split(':');
  let hour24 = parseInt(hStr, 10);
  const suffix = periodSuffixFor(hour24);
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return `${toArabicNumerals(hour12)}${suffix}`;
}

/* Builds the display string used in package cards, e.g. "٨ص - ١ظ"
   or "٤ع - ١٢ظ (اليوم التالي)" when the end time rolls into the next day. */
function formatTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return '';
  const startLabel = formatArabicTime(startTime);
  const endLabel = formatArabicTime(endTime);
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  const nextDay = endMinutes <= startMinutes;
  return `${startLabel} - ${endLabel}${nextDay ? ' (اليوم التالي)' : ''}`;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}
