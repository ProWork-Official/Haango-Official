import InfoPage from './InfoPage';

export default function SupportPage({ onNavigate }) {
  return <InfoPage eyebrow="Support" title="Help when you need it." intro="Find clear guidance for using Haango safely and confidently." sections={[
    { title: 'Bookings and payments', items: ['Check your booking status from the Bookings page.', 'Payments are processed securely through Razorpay.', 'If a payment is captured but your booking is not updated, keep your payment ID and contact support.'] },
    { title: 'Account help', items: ['Keep your email and phone number up to date.', 'Use the block and report tools when a conversation feels unsafe.', 'Never share passwords, OTPs, or payment links with another person.'] },
    { title: 'Safety concerns', body: 'For urgent safety concerns, leave the meeting, contact local emergency services, and report the account to Haango as soon as possible.' },
    { title: 'Contact the team', body: 'Email support@haango.com with your account email, booking ID, and a short description of the issue.' },
  ]} onNavigate={onNavigate} action={{ title: 'Read our safety guidance', body: 'Learn how to plan safer meet-ups and keep communication on-platform.', label: 'View safety', route: '/safety' }} />;
}
