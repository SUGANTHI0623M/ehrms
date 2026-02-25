// Integration list data
export interface IntegrationItem {
  name: string;
  key: string;
  image_url?: string;
  icon?: string;
  description: string;
  hoverMessage: string;
  status?: 'connected' | 'disconnected' | 'pending';
  route: string;
  category?: string; // Add category for grouping
}

const integrationList: IntegrationItem[] = [
  {
    name: "Exotel",
    key: "exotel",
    image_url: "/exotel.png",
    description: "Connect with Exotel to make IVR calls",
    hoverMessage: "Set up Exotel connection and preferences",
    status: 'disconnected',
    route: "/integrations/exotel",
  },
  {
    name: "Email Configuration",
    key: "email",
    image_url: "/email.jpg", // Email logo
    description: "Email Service Providers",
    hoverMessage: "Manage email service providers (SendPulse, SendGrid) and templates",
    status: 'disconnected',
    route: "/integrations/email",
    category: "Email",
  },
  {
    name: "Google Calendar",
    key: "google-calendar",
    image_url: "/Google_Calendar-Logo.wine.svg", // Google Calendar logo
    description: "Google Calendar Configuration",
    hoverMessage: "Set Configuration and get live updates on Google Calendar",
    status: 'disconnected',
    route: "/integrations/google-calendar",
  },
  {
    name: "SMS",
    key: "sms",
    image_url: "/sms.jpg", // SMS logo
    description: "SMS Configuration",
    hoverMessage: "Configure SMS gateway and messaging settings",
    status: 'disconnected',
    route: "/integrations/sms",
  },
  {
    name: "RCS",
    key: "rcs",
    image_url: "/Rcs.png", // RCS logo
    description: "RCS Configuration",
    hoverMessage: "Set up Rich Communication Services integration",
    status: 'disconnected',
    route: "/integrations/rcs",
  },
  {
    name: "Voice",
    key: "voice",
    image_url: "/voice.png",
    description: "Voice Configuration",
    hoverMessage: "Set up Voice messaging integration",
    status: 'disconnected',
    route: "/integrations/voice",
  },
  {
    name: "ASKEVA",
    key: "askeva",
    image_url: "/WhatsApp.svg.webp", // WhatsApp logo
    description: "WhatsApp API Integration",
    hoverMessage: "Configure WhatsApp messaging and webhook handling",
    status: 'disconnected',
    route: "/integrations/askeva",
  },
  {
    name: "SendGrid",
    key: "sendgrid",
    image_url: "/sendgrid.png", // SendGrid logo
    description: "Email Service Integration",
    hoverMessage: "Configure SendGrid for transactional emails and notifications",
    status: 'disconnected',
    route: "/integrations/sendgrid",
    category: "Email",
  },
  {
    name: "SendPulse",
    key: "sendpulse",
    image_url: "/sendpulse logo.png", // SendPulse logo
    description: "Email Service Integration",
    hoverMessage: "Configure SendPulse for transactional emails and notifications",
    status: 'disconnected',
    route: "/integrations/sendpulse",
    category: "Email",
  },
];

export default integrationList;

