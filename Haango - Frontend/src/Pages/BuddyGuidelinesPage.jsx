import InfoPage from './InfoPage';

export default function BuddyGuidelinesPage() {
  return <InfoPage eyebrow="For buddies" title="Set the standard for great companionship." intro="Buddies are trusted hosts on Haango. Build that trust through reliability, clear communication, and safe public plans." sections={[
    { title: 'Your profile', items: ['Use truthful information and clear, recent photos.', 'Describe your activities, availability, and boundaries accurately.', 'Keep your payout and contact details private and up to date.'] },
    { title: 'Every booking', items: ['Confirm the plan, time, and public location clearly.', 'Arrive on time and communicate promptly if plans change.', 'Never pressure a customer to share personal details or move payment off-platform.'] },
    { title: 'Safety and conduct', items: ['Meet in public places and follow Haango safety guidance.', 'Report threats, fraud, or unsafe conduct immediately.', 'Repeated cancellations, misleading profiles, or unsafe behavior may lead to suspension.'] },
  ]} />;
}
