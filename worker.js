/**
 * Tally Form Responses to Discord Webhook
 * Cloudflare Worker API
 * 
 * This worker is used to send responses from Tally forms to Discord webhooks.
 * Supports multiple forms and webhooks.
 * Routing should be done from Tally interface to Worker API as Webhook.
 */

// Import configuration
import {
  AUTH_TOKEN,
  FORM_WEBHOOKS,
  COLORS,
  FORM_COLORS,
  CUSTOM_MESSAGES,
  FIELD_SETTINGS,
  RATE_LIMITS
} from './config.js';

/**
 * Main request handler
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
});

/**
 * Handles requests
 */
async function handleRequest(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Preflight request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  // Auth token check
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header. Expected: Bearer <token>'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  if (token !== AUTH_TOKEN) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid authentication token'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  try {
    // Parse request body
    const payload = await request.json();
    
    // Payload validation
    if (!payload || !payload.data) {
      return new Response(JSON.stringify({
        error: 'Invalid payload',
        message: 'Missing required data field'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const formData = payload.data;
    
    // Form ID check
    if (!formData.formId) {
      return new Response(JSON.stringify({
        error: 'Missing form ID',
        message: 'Form ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Find webhook URL
    const webhookUrl = FORM_WEBHOOKS[formData.formId];
    if (!webhookUrl) {
      return new Response(JSON.stringify({
        error: 'Webhook not found',
        message: `No webhook configured for form ID: ${formData.formId}`
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Create and send Discord message
    const discordResponse = await sendToDiscord(webhookUrl, formData);
    
    if (discordResponse.ok) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Form response sent to Discord successfully',
        responseId: formData.responseId
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } else {
      const errorText = await discordResponse.text();
      return new Response(JSON.stringify({
        error: 'Discord webhook failed',
        message: errorText,
        status: discordResponse.status
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

  } catch (error) {
    console.error('Worker error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Sends message to Discord webhook
 */
async function sendToDiscord(webhookUrl, formData) {
  // Organize form fields
  const fields = formData.fields || [];
  const formattedFields = [];

  // Convert each form field to Discord embed field
  fields.forEach(field => {
    // Filter hidden fields
    if (FIELD_SETTINGS?.hiddenFields?.includes(field.key)) {
      return;
    }

    let value = field.value;
    let label = field.label;
    
    // Find option text for multiple choice
    if (field.type === 'MULTIPLE_CHOICE' && field.options) {
      const selectedOption = field.options.find(option => option.id === field.value);
      value = selectedOption ? selectedOption.text : field.value;
    }

    // Use custom field label
    if (FIELD_SETTINGS?.fieldLabels?.[field.key]) {
      label = FIELD_SETTINGS.fieldLabels[field.key];
    }

    // Use custom field formatter
    if (FIELD_SETTINGS?.fieldFormatters?.[field.key]) {
      value = FIELD_SETTINGS.fieldFormatters[field.key](value);
    }

    // Filter empty values
    if (value && value.toString().trim() !== '') {
      formattedFields.push({
        name: label.length > 256 ? label.substring(0, 253) + '...' : label,
        value: value.toString().length > 1024 ? value.toString().substring(0, 1021) + '...' : value.toString(),
        inline: false
      });
    }
  });

  // Get form-specific settings
  const customMessage = CUSTOM_MESSAGES?.[formData.formId];
  const formColor = FORM_COLORS?.[formData.formId] || COLORS.INFO;

  // Create Discord embed
  const embed = {
    title: customMessage?.title || `📝 New Form Response`,
    description: customMessage?.description || `**Form:** ${formData.formName || 'Unknown Form'}`,
    color: formColor,
    fields: formattedFields,
    footer: {
      text: `Response ID: ${formData.responseId} | Submission ID: ${formData.submissionId}`
    },
    timestamp: formData.createdAt || new Date().toISOString()
  };

  // Discord webhook payload
  const discordPayload = {
    username: 'Tally Form Bot',    
    embeds: [embed]
  };

  // Send to Discord
  return await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(discordPayload)
  });
}

/**
 * Utility function: Text truncation
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
