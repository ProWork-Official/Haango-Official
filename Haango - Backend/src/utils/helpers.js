export function generateBookingId() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900000 + 100000);
  return `HNG-${year}-${String(random).padStart(6, '0')}`;
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function maskPhone(phone) {
  if (phone.length < 4) return '****';
  return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
}
