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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-URL',
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
    
    // Check for webhook URL in header first
    const headerWebhookUrl = request.headers.get('X-Webhook-URL');
    let webhookUrl = null;

    if (headerWebhookUrl) {
      // Validate webhook URL format
      try {
        const url = new URL(headerWebhookUrl);
        if (url.hostname === 'discord.com' || url.hostname === 'discordapp.com') {
          webhookUrl = headerWebhookUrl;
        } else {
          return new Response(JSON.stringify({
            error: 'Invalid webhook URL',
            message: 'Webhook URL must be a valid Discord webhook URL'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      } catch (e) {
        return new Response(JSON.stringify({
          error: 'Invalid webhook URL',
          message: 'Webhook URL format is invalid'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    } else {
      // Fall back to configured webhook
      if (!formData.formId) {
        return new Response(JSON.stringify({
          error: 'Missing form ID or webhook URL',
          message: 'Either provide form ID (for configured forms) or X-Webhook-URL header'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Find webhook URL from config
      webhookUrl = FORM_WEBHOOKS[formData.formId];
      if (!webhookUrl) {
        return new Response(JSON.stringify({
          error: 'Webhook not found',
          message: `No webhook configured for form ID: ${formData.formId}. You can also provide X-Webhook-URL header.`
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
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
    
    // Handle different field types
    switch (field.type) {
      case 'MULTIPLE_CHOICE':
        if (field.options && Array.isArray(field.value)) {
          const selectedOptions = field.options.filter(option => field.value.includes(option.id));
          value = selectedOptions.map(option => option.text).join(', ');
        } else if (field.options && field.value) {
          const selectedOption = field.options.find(option => option.id === field.value);
          value = selectedOption ? selectedOption.text : field.value;
        }
        break;
        
      case 'CHECKBOXES':
        if (Array.isArray(field.value) && field.options) {
          const selectedOptions = field.options.filter(option => field.value.includes(option.id));
          value = selectedOptions.map(option => option.text).join(', ');
        } else if (typeof field.value === 'boolean') {
          value = field.value ? '✅ Yes' : '❌ No';
        }
        break;
        
      case 'DROPDOWN':
      case 'MULTI_SELECT':
        if (field.options && Array.isArray(field.value)) {
          const selectedOptions = field.options.filter(option => field.value.includes(option.id));
          value = selectedOptions.map(option => option.text).join(', ');
        }
        break;
        
      case 'RANKING':
        if (field.options && Array.isArray(field.value)) {
          const rankedOptions = field.value.map((id, index) => {
            const option = field.options.find(opt => opt.id === id);
            return `${index + 1}. ${option ? option.text : id}`;
          });
          value = rankedOptions.join('\n');
        }
        break;
        
      case 'MATRIX':
        if (field.rows && field.columns && typeof field.value === 'object') {
          const matrixResults = [];
          Object.entries(field.value).forEach(([rowId, columnIds]) => {
            const row = field.rows.find(r => r.id === rowId);
            if (Array.isArray(columnIds)) {
              const columns = field.columns.filter(c => columnIds.includes(c.id));
              matrixResults.push(`${row?.text || rowId}: ${columns.map(c => c.text).join(', ')}`);
            }
          });
          value = matrixResults.join('\n');
        }
        break;
        
      case 'FILE_UPLOAD':
        if (Array.isArray(field.value)) {
          value = field.value.map(file => 
            `📎 [${file.name}](${file.url}) (${(file.size / 1024).toFixed(1)} KB)`
          ).join('\n');
        }
        break;
        
      case 'SIGNATURE':
        if (Array.isArray(field.value)) {
          value = field.value.map(file => 
            `✍️ [${file.name}](${file.url}) (${(file.size / 1024).toFixed(1)} KB)`
          ).join('\n');
        }
        break;
        
      case 'RATING':
        if (typeof field.value === 'number') {
          value = `⭐ ${field.value}/5`;
        }
        break;
        
      case 'LINEAR_SCALE':
        if (typeof field.value === 'number') {
          value = `📊 ${field.value}/10`;
        }
        break;
        
      case 'INPUT_EMAIL':
        value = `📧 ${field.value}`;
        break;
        
      case 'INPUT_PHONE_NUMBER':
        value = `📱 ${field.value}`;
        break;
        
      case 'INPUT_LINK':
        value = `🔗 ${field.value}`;
        break;
        
      case 'INPUT_DATE':
        value = `📅 ${field.value}`;
        break;
        
      case 'INPUT_TIME':
        value = `🕐 ${field.value}`;
        break;
        
      case 'PAYMENT':
        if (field.label.includes('price')) {
          value = `💰 $${field.value}`;
        } else if (field.label.includes('currency')) {
          value = `💱 ${field.value}`;
        } else if (field.label.includes('name')) {
          value = `👤 ${field.value}`;
        } else if (field.label.includes('email')) {
          value = `📧 ${field.value}`;
        } else if (field.label.includes('link')) {
          value = `🔗 [Payment Link](${field.value})`;
        } else {
          value = `💳 ${field.value}`;
        }
        break;
        
      case 'HIDDEN_FIELDS':
        value = `🔒 ${field.value}`;
        break;
        
      case 'CALCULATED_FIELDS':
        value = `🧮 ${field.value}`;
        break;
        
      default:
        // For all other types (INPUT_TEXT, TEXTAREA, INPUT_NUMBER), use value as-is
        break;
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
