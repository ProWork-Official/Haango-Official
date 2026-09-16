import InfoPage from './InfoPage';

export default function CommunityGuidelinesPage() {
  return <InfoPage eyebrow="Community guidelines" title="Make Haango welcoming for everyone." intro="Haango works when people treat one another with respect, honesty, and care." sections={[
    { title: 'Be respectful', items: ['Use kind, inclusive language.', 'Respect boundaries, identities, time, and personal choices.', 'Do not harass, threaten, discriminate against, or pressure anyone.'] },
    { title: 'Be honest', items: ['Use accurate profile information and recent photos.', 'Do not impersonate another person or create misleading listings.', 'Keep bookings and payments transparent.'] },
    { title: 'Keep it platonic and safe', items: ['Haango is for social companionship, not sexual services or exploitation.', 'Do not request illegal activity, private arrangements, or off-platform payments.', 'Report behavior that violates these guidelines.'] },
    { title: 'Enforcement', body: 'We may warn, restrict, suspend, or remove accounts and content that put people or the community at risk.' },
  ]} />;
}
