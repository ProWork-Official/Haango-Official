import InfoPage from './InfoPage';

export default function ContactPage({ onNavigate }) {
  return <InfoPage eyebrow="Contact" title="We are here to help." intro="Have a question, partnership idea, or feedback about Haango? Our team would love to hear from you." sections={[
    { title: 'Customer support', body: 'For booking, payment, account, or safety questions, contact our support team at support@haango.com. Please include your registered email and booking ID when relevant.' },
    { title: 'Partnerships', body: 'For business, community, or city partnership enquiries, write to hello@haango.com and tell us how you would like to work together.' },
  ]} onNavigate={onNavigate} action={{ title: 'Need immediate help?', body: 'Visit the Support page for answers to common questions and help with an active booking.', label: 'Open support', route: '/support' }} />;
}
