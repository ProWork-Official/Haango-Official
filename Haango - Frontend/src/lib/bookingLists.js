const INDIA_OFFSET_MINUTES = 330;

export const BOOKING_LIST_FILTERS = [
  { value: 'newest', label: 'Latest booking first' },
  { value: 'farthest', label: 'Farthest meeting first' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'date', label: 'Choose a date' },
];

export function getIndiaDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getIndiaDateOffset(offset, value = Date.now()) {
  const dateKey = getIndiaDateKey(value);
  if (!dateKey) return '';
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function getBookingStartTime(booking) {
  const timeValue = String(booking.startTime || '').trim().toUpperCase();
  const twelveHourMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(timeValue);
  const twentyFourHourMatch = /^(\d{1,2}):(\d{2})$/.exec(timeValue);
  const match = twelveHourMatch || twentyFourHourMatch;
  if (!match) return Number.NaN;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > (twelveHourMatch ? 12 : 23)) return Number.NaN;
  if (twelveHourMatch) {
    if (hours === 12) hours = 0;
    if (match[3] === 'PM') hours += 12;
  }

  const dateKey = getIndiaDateKey(booking.date);
  if (!dateKey) return Number.NaN;
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes) - INDIA_OFFSET_MINUTES * 60 * 1000;
}

export function getBookingEndTime(booking) {
  return getBookingStartTime(booking) + Number(booking.duration || 0) * 60 * 60 * 1000;
}

export function getNextUpcomingBooking(bookings, now = Date.now()) {
  return bookings
    .filter((booking) => (
      !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus)
      && getBookingEndTime(booking) > now
    ))
    .sort((first, second) => getBookingStartTime(first) - getBookingStartTime(second))[0] || null;
}

export function getBookingList(bookings, { section, filter, selectedDate, now }) {
  const nowDateKey = getIndiaDateKey(now);
  const targetDate = filter === 'today'
    ? nowDateKey
    : filter === 'tomorrow'
      ? getIndiaDateOffset(1, now)
      : selectedDate;

  return bookings
    .filter((booking) => {
      const isCancelled = ['CANCELLED', 'REJECTED'].includes(booking.bookingStatus);
      const isPast = isCancelled
        || booking.bookingStatus === 'COMPLETED'
        || !(getBookingEndTime(booking) > now);
      if (section === 'upcoming' ? isPast : !isPast) return false;
      if (filter === 'today' || filter === 'tomorrow' || filter === 'date') {
        return Boolean(targetDate) && getIndiaDateKey(booking.date) === targetDate;
      }
      return true;
    })
    .sort((first, second) => {
      if (filter === 'farthest') return getBookingStartTime(second) - getBookingStartTime(first);
      return new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime();
    });
}