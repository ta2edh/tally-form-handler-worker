# Tally to Discord Webhook - Cloudflare Worker

This Cloudflare Worker is used to send responses from Tally forms to Discord webhooks. It supports multiple forms and webhooks.

## Features

- 🚀 Cloudflare Worker based (fast and reliable)
- 🔐 Security with auth token
- 📝 Multiple Tally form support
- 🔗 Different Discord webhook for each form
- 🌐 Dynamic webhook URL support via headers
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

### Method 1: Using Configured Forms

1. Add your form ID and webhook URL to `config.js`
2. Configure Tally webhook to point to your worker
3. Form responses will be automatically routed to the correct Discord channel

### Method 2: Using Dynamic Webhook URL (New!)

You can now send form responses to any Discord webhook without pre-configuring them:

1. Configure Tally webhook to point to your worker
2. Add `X-Webhook-URL` header with the Discord webhook URL
3. No need to configure the form in `config.js`

#### Tally Webhook Configuration (Dynamic)

1. Go to your form on Tally.so
2. Settings > Integrations > Webhooks
3. Add your Worker URL: `https://your-worker.your-subdomain.workers.dev`
4. Add custom header: `X-Webhook-URL` with value: `https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN`
5. Select POST method
6. Activate the webhook

### Testing

To test with dynamic webhook URL:

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-auth-token-here" \
  -H "X-Webhook-URL: https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN" \
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
X-Webhook-URL: https://discord.com/api/webhooks/ID/TOKEN (optional)
```

**Note:** If `X-Webhook-URL` header is provided, it will override any configured webhook for the form ID.

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
- **OR** use the `X-Webhook-URL` header to bypass configuration
- Make sure the form ID is correct

### Invalid webhook URL header
- Make sure the webhook URL is a valid Discord webhook URL
- URL must start with `https://discord.com/api/webhooks/` or `https://discordapp.com/api/webhooks/`

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
