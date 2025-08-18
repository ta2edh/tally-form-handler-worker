# Tally to Discord Webhook - Cloudflare Worker

This Cloudflare Worker is used to send responses from Tally forms to Discord webhooks. It supports multiple forms and webhooks.

## Features

- 🚀 Cloudflare Worker based (fast and reliable)
- 🔐 Security with auth token
- 📝 Multiple Tally form support
- 🔗 Different Discord webhook for each form
- 📊 Beautifully formatted Discord embed messages
- 🛡️ CORS support
- ✅ Error handling and validation
- 📱 Automatic option conversion for multiple choice fields
- ⚙️ File-based configuration system
- 🎨 Form-specific message formats and colors
- 👁️ Field visibility and formatting settings

## Installation

### 1. Requirements

- [Cloudflare account](https://cloudflare.com)
- [Node.js](https://nodejs.org) (v16+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### 2. Wrangler CLI Installation

```bash
npm install -g wrangler
```

### 3. Login to Cloudflare

```bash
wrangler auth login
```

### 4. Deploy Worker

```bash
wrangler deploy
```

## Configuration

### Setting Auth Token

Change the `AUTH_TOKEN` value in the `config.js` file:

```javascript
const AUTH_TOKEN = 'your-super-secret-token-here-123456';
```

**Important:** Keep this token secure and use a random, hard-to-guess value.

### Adding Discord Webhook URLs

Edit the `FORM_WEBHOOKS` object in the `config.js` file:

```javascript
const FORM_WEBHOOKS = {
  'formId1': 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
  'formId2': 'https://discord.com/api/webhooks/WEBHOOK_ID_2/WEBHOOK_TOKEN_2',
  'formId3': 'https://discord.com/api/webhooks/WEBHOOK_ID_3/WEBHOOK_TOKEN_3',
};
```

### Getting Discord Webhook URL

1. Go to a channel in your Discord server
2. Channel settings > Integrations > Webhooks
3. Create "New Webhook"
4. Copy the webhook URL

### Finding Tally Form ID

1. Go to your form on Tally.so
2. You can see the form ID in the URL: `https://tally.so/forms/formId`
3. Or you can find it in form settings

## Usage

### Tally Webhook Configuration

1. Go to your form on Tally.so
2. Settings > Integrations > Webhooks
3. Add your Worker URL: `https://your-worker.your-subdomain.workers.dev`
4. Select POST method
5. Activate the webhook

### Testing

To test your worker, send a sample payload with auth token:

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-auth-token-here" \
  -d @example.json
```

Or use the test script:

```bash
# First, make the authToken in test.js the same as config.js
node test.js
```

## API Endpoints

### POST /

Sends Tally form responses to Discord.

#### Request Headers
```
Content-Type: application/json
Authorization: Bearer your-secret-auth-token-here
```

#### Request Body
```json
{
  "eventId": "string",
  "createdAt": "string",
  "data": {
    "responseId": "string",
    "submissionId": "string",
    "respondentId": "string",
    "formId": "string",
    "formName": "string",
    "createdAt": "string",
    "fields": [
      {
        "key": "string",
        "label": "string",
        "type": "string",
        "value": "string",
        "options": [
          {
            "id": "string",
            "text": "string"
          }
        ]
      }
    ]
  }
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Form response sent to Discord successfully",
  "responseId": "N909XG"
}
```

**Auth Error (401):**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authorization header. Expected: Bearer <token>"
}
```

**Other Errors (400/404/500):**
```json
{
  "error": "Error type",
  "message": "Error description"
}
```

## Supported Field Types

- `INPUT_TEXT` - Text input
- `INPUT_PHONE_NUMBER` - Phone number
- `TEXTAREA` - Long text
- `MULTIPLE_CHOICE` - Multiple choice (automatic option text conversion)
- And other Tally field types

## Security

- Worker supports CORS
- Only POST requests are accepted
- Payload validation is performed
- No sensitive information is leaked in error cases

## Development

### Local Development

```bash
wrangler dev
```

### Logs

```bash
wrangler tail
```

### Environment Variables

You can define environment variables in `wrangler.toml` file:

```toml
[vars]
ENVIRONMENT = "production"
DEBUG = "false"
```

## Troubleshooting

### Form ID not found
- Check if your form ID is defined in the `FORM_WEBHOOKS` object
- Make sure the form ID is correct

### Discord webhook not working
- Make sure the webhook URL is correct
- Check if the Discord webhook is active
- Check webhook permissions

### Worker cannot be deployed
- Make sure Wrangler CLI is up to date
- Make sure you are logged in to your Cloudflare account
- Make sure `wrangler.toml` file is configured correctly

## License

MIT License

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request
