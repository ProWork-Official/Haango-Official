import InfoPage from './InfoPage';

export default function CancellationPolicyPage() {
  return <InfoPage eyebrow="Legal" title="Cancellation Policy" intro="We want plans to stay flexible while treating both customers and buddies fairly." sections={[
    { title: 'Before the plan', body: 'Cancel as early as possible from your Bookings page. Cancellation requests close once the meeting starts and may require support review.' },
    { title: 'Buddy cancellations', body: 'Buddies should communicate promptly and avoid repeated cancellations. Haango may review reliability and take action when cancellations affect customers.' },
    { title: 'Support', body: 'If a booking was cancelled incorrectly, contact support@haango.in with the booking ID.' },
  ]} />;
}
