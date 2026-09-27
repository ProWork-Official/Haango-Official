import { BOOKING_LIST_FILTERS } from '../lib/bookingLists';

export default function BookingListFilters({
  label,
  value,
  onChange,
  dateValue,
  onDateChange,
  minDate,
  maxDate,
}) {
  return (
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-xs font-semibold text-ink-600">
        {label} filter
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-800"
        >
          {BOOKING_LIST_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {value === 'date' && (
        <label className="grid gap-1 text-xs font-semibold text-ink-600">
          Booking date
          <input
            type="date"
            value={dateValue}
            onChange={(event) => onDateChange(event.target.value)}
            min={minDate}
            max={maxDate}
            className="min-h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-800"
          />
        </label>
      )}
    </div>
  );
}