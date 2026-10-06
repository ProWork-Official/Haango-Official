import InfoPage from './InfoPage';

export default function PrivacyPolicyPage() {
  return <InfoPage eyebrow="Legal" title="Privacy Policy" intro="This page explains the information Haango collects and how we use it to operate a safer companionship platform." sections={[
    { title: 'Information we collect', body: 'We may collect account details, profile information, booking records, messages, reports, marketing preferences, and technical usage data such as pages visited, session duration, IP address, and approximate location inferred from IP address.' },
    { title: 'How we use information', body: 'We use information to provide bookings, support, safety reviews, fraud prevention, analytics, and service improvements. For approximate location analytics, visitor IP addresses are sent to IPWho.is for lookup; the resulting location is not GPS-precise. WhatsApp promotions are sent only when you opt in. You can turn them off in your profile or reply STOP; manually sent WhatsApp replies are not automatically synchronized with Haango.' },
    { title: 'Your choices', body: 'You may request corrections to your account information through support. Some records may need to be retained for legal, safety, or fraud-prevention reasons.' },
    { title: 'Contact', body: 'For privacy questions, contact privacy@haango.com.' },
  ]} />;
}
