import InfoPage from './InfoPage';

export default function PrivacyPolicyPage() {
  return <InfoPage eyebrow="Legal" title="Privacy Policy" intro="This page explains the information Haango collects and how we use it to operate a safer companionship platform." sections={[
    { title: 'Information we collect', body: 'We may collect account details, profile information, booking and payment references, messages, reports, and technical usage data such as pages visited and session duration.' },
    { title: 'How we use information', body: 'We use information to provide bookings, payments, support, safety reviews, fraud prevention, analytics, and service improvements.' },
    { title: 'Your choices', body: 'You may request corrections to your account information through support. Some records may need to be retained for legal, safety, fraud-prevention, or payment reasons.' },
    { title: 'Contact', body: 'For privacy questions, contact privacy@haango.com.' },
  ]} />;
}
