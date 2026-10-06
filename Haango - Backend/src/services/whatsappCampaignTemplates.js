const callButton = (text) => ({ type: 'PHONE_NUMBER', text, phoneNumber: '918400732040' });
const appendActionText = (message, buttons) => {
  const optOutText = '\n\nReply STOP to opt out.';
  const body = message.endsWith(optOutText) ? message.slice(0, -optOutText.length) : message;
  const actions = buttons.map((button) => (
    button.type === 'URL'
      ? `${button.text}: ${button.url}`
      : `${button.text}: +91 8400732040`
  )).join('\n');
  return `${body}\n\nHaango website: https://haango.in\n${actions}${optOutText}`;
};

const templates = [
  {
    id: 'haango_welcome_offer',
    name: 'haango_welcome_offer',
    title: 'New user and activity booking',
    category: 'Customer offer',
    message: `Tired of canceled plans or going out alone?\n\nThis is the perfect time to try *Haango*!\n\n🎁 Get *₹100 Free Booking Credit* added to your account instantly!\n\n🧑‍🎓 Special Offers for college students & young professionals in Prayagraj.\n\nAnd you can choose your benefit 👇\n\n💳 *Flat ₹100 OFF* on your first Movie or Café Outing (Use Code: *SAVE100*)\n\nOR\n\n💰 *₹100 Instant Credit* applied directly on registration (Use Code: *WELCOME100*)\n\n➕ *100% Safe* with In-App Private Chat & OTP Check-in Verification\n\n📞 Call Us +91 8400732040\n\nFind Company. Save. Make Memories!\n\nLimited-period launch offer. T&C apply.\n\nReply STOP to opt out.`,
    buttons: [
      { type: 'URL', text: 'Book Activity', url: 'https://bit.ly/HaangoBook' },
      { type: 'URL', text: 'Browse Companions', url: 'https://bit.ly/HaangoApp' },
      callButton('Call Support'),
    ],
  },
  {
    id: 'haango_buddy_recruitment',
    name: 'haango_buddy_recruitment',
    title: 'Buddy recruitment',
    category: 'Buddy recruitment',
    message: `Want to turn your free time into extra income?\n\nBecome a *Haango Buddy* today!\n\n🎁 Get *₹75 Instant Cash* in your Buddy Wallet on signup!\n\n🌟 Special onboarding for students, creators & locals in Prayagraj.\n\nAnd you can choose your benefit 👇\n\n☕ *Earn ₹1,000 per Café Outing* on your own schedule\n\nOR\n\n🎬 *Earn ₹500 per Movie Night* + Enjoy free movie/food experiences!\n\n➕ *100% FREE* profile creation & verified safety features\n\n📞 Call Us +91 8400732040\n\nJoin Free. Hang Out. Earn Cash!\n\nUse Code: *BUDDYBONUS75* on signup. T&C apply.\n\nReply STOP to opt out.`,
    buttons: [
      { type: 'URL', text: 'Become a Buddy', url: 'https://bit.ly/HaangoBuddy' },
      { type: 'URL', text: 'Learn How It Works', url: 'https://bit.ly/HaangoInfo' },
      callButton('Call Us'),
    ],
  },
  {
    id: 'haango_festive_event',
    name: 'haango_festive_event',
    title: 'Festive and event partner offer',
    category: 'Seasonal offer',
    message: `Got your event pass but missing a Dandiya partner?\n\nBook verified event companions on *Haango*!\n\n🎁 Event companions starting at just *₹300/hour*!\n\n🪔 Special Festive Offers for Navratri & City Events in Prayagraj.\n\nAnd you can choose your benefit 👇\n\n💃 *Flat ₹100 OFF* on your Festive Partner Booking (Use Code: *SAVE100*)\n\nOR\n\n💳 *₹100 Booking Credit* for new users (Use Code: *WELCOME100*)\n\n➕ *Double OTP Check-in* & zero phone number sharing for 100% safety\n\n📞 Call Us +91 8400732040\n\nDress Up. Dance. Make Memories!\n\nLimited festive slots available. T&C apply.\n\nReply STOP to opt out.`,
    buttons: [
      { type: 'URL', text: 'Book Garba Buddy', url: 'https://bit.ly/HaangoGarba' },
      { type: 'URL', text: 'View Profiles', url: 'https://bit.ly/HaangoApp' },
      callButton('Call Support'),
    ],
  },
  {
    id: 'haango_weekend_rescue',
    name: 'haango_weekend_rescue',
    title: 'Weekend outings',
    category: 'Customer offer',
    message: `Did your group chat just flake on your weekend plans?\n\nRescue your weekend with *Haango*!\n\n🎁 Get a *Flat ₹100 Discount* on your weekend companion booking!\n\n☕ Perfect for Café Hopping, Movies & Street Food Outings.\n\nAnd you can choose your benefit 👇\n\n🎬 *Movie Night Companion* @ ₹500 Base Fee (Flat ₹100 OFF with code: *SAVE100*)\n\nOR\n\n☕ *Café Outing Companion* @ ₹1,000 Base Fee (Get ₹100 credit with code: *WELCOME100*)\n\n➕ Standardized transparent pricing — no awkward price haggling!\n\n📞 Call Us +91 8400732040\n\nNo Flakes. Just Real Outings!\n\nValid till 31st October. T&C apply.\n\nReply STOP to opt out.`,
    buttons: [
      { type: 'URL', text: 'Book Weekend Plan', url: 'https://bit.ly/HaangoOutings' },
      { type: 'URL', text: 'Explore Companions', url: 'https://bit.ly/HaangoApp' },
      callButton('Call Support'),
    ],
  },
  {
    id: 'haango_reengagement',
    name: 'haango_reengagement',
    title: 'Re-engagement offer',
    category: 'Re-engagement',
    message: `Missed out on exploring new spots in Prayagraj?\n\nWe unlocked a special reward for you!\n\n🎁 Get *₹100 Off* on your next activity booking on *Haango*!\n\n🛡️ Non-dating, 100% activity-focused social experiences.\n\nAnd you can choose your benefit 👇\n\n🍿 *Flat ₹100 OFF* on your next Movie or Café outing (Use Code: *SAVE100*)\n\nOR\n\n🎟️ *Invite a Friend* & both get ₹100 booking credits added to your wallet!\n\n➕ In-app private chat keeps your phone number completely hidden\n\n📞 Call Us +91 8400732040\n\nReconnect. Explore. Enjoy!\n\nOffer valid for the next 48 hours. T&C apply.\n\nReply STOP to opt out.`,
    buttons: [
      { type: 'URL', text: 'Open Haango App', url: 'https://bit.ly/HaangoApp' },
      { type: 'URL', text: 'Explore New Spots', url: 'https://bit.ly/HaangoSpots' },
      callButton('Call Us'),
    ],
  },
];

export function getWhatsAppCampaignTemplates() {
  return templates.map(({ id, name, title, category, message, buttons }) => ({
    id,
    name,
    title,
    category,
    message: appendActionText(message, buttons),
    buttons: buttons.map((button) => ({ ...button })),
  }));
}

export function getWhatsAppCampaignTemplate(templateId) {
  return templates.find((template) => template.id === templateId) || null;
}