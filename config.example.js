/**
 * Configuration File
 * Settings for Worker
 */

// Auth Token - API won't work without this token
// Should be sent in header as "Authorization: Bearer YOUR_TOKEN"
const AUTH_TOKEN = 'YOUR_TOKEN';

// 1. Form IDs and Discord webhook URLs mapping
const FORM_WEBHOOKS = {
  // Example form
  'formId': 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
};

// 2. Discord embed colors (hex color codes)
const COLORS = {
  SUCCESS: 0x00ff00, 
  INFO: 0x0099ff,    
  WARNING: 0xffcc00, 
  ERROR: 0xff0000,   
  CUSTOM: 0x7289da    
};

// 3. Color selection by form type (optional)
const FORM_COLORS = {
  'formId': COLORS.INFO,
};

// 4. Custom message formats (optional)
const CUSTOM_MESSAGES = {
  'formId': {
    title: 'Embed Title',
    description: 'Embed Description'
  },
};

// 5. Field visibility settings (optional)
const FIELD_SETTINGS = {
  // Which fields should we not show in Discord
  hiddenFields: [
    'question_fieldId',
  ],
  
  // Rename fields
  fieldLabels: {
    'question_fieldId': '👤 Name',
  },
  
  // Custom field formatters
  fieldFormatters: {
    'question_fieldId': (value) => `📧 ${value}`,
    'question_3yboYB': (value) => `📱 ${value}`
  }
};

// 6. Rate limiting settings (optional)
const RATE_LIMITS = {
  enabled: false,
  maxRequestsPerMinute: 60,
  maxRequestsPerHour: 1000
};

// Export configuration
export {
  AUTH_TOKEN,
  FORM_WEBHOOKS,
  COLORS,
  FORM_COLORS,
  CUSTOM_MESSAGES,
  FIELD_SETTINGS,
  RATE_LIMITS
};