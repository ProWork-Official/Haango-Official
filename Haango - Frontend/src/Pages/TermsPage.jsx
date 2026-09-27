import InfoPage from './InfoPage';

export default function TermsPage() {
  return <InfoPage eyebrow="Legal" title="Terms of Service" intro="By using Haango, you agree to use the service lawfully, respectfully, and in line with these terms." sections={[
    { title: 'Using Haango', body: 'You must provide accurate information, protect your account, and use the platform only for lawful social companionship activities.' },
    { title: 'Bookings', body: 'A booking request is subject to the selected plan, cancellation rules, and the availability of the companion. A plan is confirmed when the companion accepts the request.' },
    { title: 'Community standards', body: 'Harassment, fraud, impersonation, exploitation, unsafe conduct, and attempts to evade platform safeguards are prohibited.' },
    { title: 'Account action', body: 'Haango may restrict, suspend, or remove accounts when necessary to protect users, investigate reports, or comply with law.' },
  ]} />;
}
