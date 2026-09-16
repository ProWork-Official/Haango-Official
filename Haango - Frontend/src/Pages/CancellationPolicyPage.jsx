import InfoPage from './InfoPage';

export default function CancellationPolicyPage() {
  return <InfoPage eyebrow="Legal" title="Cancellation Policy" intro="We want plans to stay flexible while treating both customers and buddies fairly." sections={[
    { title: 'Before the plan', body: 'Cancel as early as possible from your Bookings page. The amount and timing of any refund depend on the booking status, payment status, and applicable cancellation rules.' },
    { title: 'Paid bookings', body: 'Eligible captured payments are refunded through the original payment provider. Refund processing time depends on Razorpay and your bank.' },
    { title: 'Buddy cancellations', body: 'Buddies should communicate promptly and avoid repeated cancellations. Haango may review reliability and take action when cancellations affect customers.' },
    { title: 'Support', body: 'If a booking was cancelled incorrectly or a refund is missing, contact support@haango.com with the booking ID and payment reference.' },
  ]} />;
}
