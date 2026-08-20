const fs = require('fs');

const workflow = {
  name: "HITL AI Content Engine - Unified Simple Loop",
  nodes: [
    {
      parameters: { httpMethod: "POST", path: "trigger", options: {} },
      id: "webhook_start", name: "Start Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [0, 300], webhookId: "trigger-workflow"
    },
    {
      parameters: { resume: "webhook", options: {} },
      id: "wait", name: "Wait for Approval", type: "n8n-nodes-base.wait", typeVersion: 1.1, position: [1400, 300], webhookId: "wait-for-approval"
    },
    {
      parameters: { chatId: "={{ $env.TELEGRAM_CHAT_ID }}", text: "=🚀 Task Received! Generating concepts for: {{ $json.body.brief }}", additionalFields: {} },
      id: "tel_start", name: "Telegram: Task Received", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [200, 300],
      credentials: { telegramApi: { id: "your-telegram-credentials", name: "Telegram account" } }
    },
    {
      parameters: {
        conditions: {
          string: [
            { value1: "={{ $json.body.action }}", operation: "equal", value2: "regenerate" }
          ]
        }
      },
      id: "if_action", name: "Check Action", type: "n8n-nodes-base.if", typeVersion: 1, position: [1600, 300]
    },
    {
      parameters: { chatId: "={{ $env.TELEGRAM_CHAT_ID }}", text: "=🔄 Regenerating ALL concepts based on brief...", additionalFields: {} },
      id: "tel_regen", name: "Telegram: Regenerating", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [400, 500],
      credentials: { telegramApi: { id: "your-telegram-credentials", name: "Telegram account" } }
    },
    
    // AI Generation block
    {
      parameters: {
        keepOnlySet: false,
        values: {
          string: [
            {
              name: "chatInput",
              value: "={{ $('Start Webhook').item ? $('Start Webhook').item.json.body.brief : $('Wait for Approval').item.json.body.brief }}"
            }
          ]
        },
        options: {}
      },
      id: "set_prompt", name: "Set Prompt", type: "n8n-nodes-base.set", typeVersion: 2, position: [500, 300]
    },
    {
      parameters: { hasOutputParser: true, options: { systemMessage: "You are an expert social media manager and prompt engineer. Create a highly detailed image generation prompt, an engaging caption, and a list of relevant hashtags based on the user's brief." } },
      id: "ai_agent", name: "AI Agent (Unified)", type: "@n8n/n8n-nodes-langchain.agent", typeVersion: 3.1, position: [700, 300]
    },
    {
      parameters: { modelName: "models/gemini-3.1-flash-lite", options: {} },
      id: "gemini", name: "Google Gemini", type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini", typeVersion: 1.1, position: [600, 100],
      credentials: { googlePalmApi: { id: "your-gemini-credentials", name: "Google Gemini(PaLM) Api account" } }
    },
    {
      parameters: { jsonSchema: "{\n  \"type\": \"object\",\n  \"properties\": {\n    \"caption\": { \"type\": \"string\" },\n    \"hashtags\": { \"type\": \"string\" },\n    \"image_prompt\": { \"type\": \"string\" }\n  },\n  \"required\": [\"caption\", \"hashtags\", \"image_prompt\"]\n}" },
      id: "parser", name: "Output Parser", type: "@n8n/n8n-nodes-langchain.outputParserStructured", typeVersion: 1.3, position: [750, 100]
    },

    // Image Gen & API
    {
      parameters: {
        method: "POST", 
        url: "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-3-medium-diffusers",
        authentication: "genericCredentialType", 
        genericAuthType: "httpBearerAuth", 
        sendHeaders: true,
        headerParameters: { parameters: [ { name: "Accept", value: "image/png" } ] },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify({ inputs: $json.image_prompt }) }}",
        options: { response: { response: { responseFormat: "file", outputPropertyName: "imageData" } } }
      },
      id: "hf", name: "Hugging Face Image Gen", type: "n8n-nodes-base.httpRequest", typeVersion: 4.5, position: [900, 300],
      credentials: { httpBearerAuth: { id: "your-hf-credentials", name: "Bearer Auth account" } }
    },
    {
      parameters: {
        method: "POST", url: "={{ $env.FRONTEND_URL }}/api/catch-draft", sendBody: true,
        bodyParameters: { parameters: [
          { name: "id", value: "={{ $('Wait for Approval').item ? $('Wait for Approval').item.json.body.id : '' }}" },
          { name: "brief", value: "={{ $('Start Webhook').item ? $('Start Webhook').item.json.body.brief : $('Wait for Approval').item.json.body.brief }}" },
          { name: "caption", value: "={{ $('AI Agent (Unified)').item.json.caption }}" },
          { name: "hashtags", value: "={{ $('AI Agent (Unified)').item.json.hashtags }}" },
          { name: "image_prompt", value: "={{ $('AI Agent (Unified)').item.json.image_prompt }}" },
          { name: "image_data", value: "=data:image/png;base64,{{ $binary.imageData.data }}" },
          { name: "resumeUrl", value: "={{ $execution.resumeUrl }}" }
        ] },
        options: {}
      },
      id: "send_draft", name: "Send Draft to Dashboard", type: "n8n-nodes-base.httpRequest", typeVersion: 4.1, position: [1150, 300]
    },

    // Approval Flow (IF False)
    {
      parameters: { chatId: "={{ $env.TELEGRAM_CHAT_ID }}", text: "=✅ Concept Approved! Publishing to GitHub...", additionalFields: {} },
      id: "tel_appr", name: "Telegram: Approved", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [1800, 400],
      credentials: { telegramApi: { id: "your-telegram-credentials", name: "Telegram account" } }
    },
    {
      parameters: { authentication: "oAuth2", resource: "file", operation: "create", owner: "SameerKr-26", repository: "Content-Generation", filePath: "=images/img_{{ $now.toFormat('yyyyMMddHHmmss') }}.png", fileContent: "={{ $('Wait for Approval').item.json.body.image_data.split(',')[1] }}", commitMessage: "Add generated image" },
      id: "gh_img", name: "GitHub: Push Image", type: "n8n-nodes-base.github", typeVersion: 1, position: [2000, 300],
      credentials: { githubOAuth2Api: { id: "your-github-credentials", name: "GitHub account" } }
    },
    {
      parameters: { authentication: "oAuth2", resource: "file", operation: "create", owner: "SameerKr-26", repository: "Content-Generation", filePath: "=captions/cap_{{ $now.toFormat('yyyyMMddHHmmss') }}.txt", fileContent: "={{ $('Wait for Approval').item.json.body.caption }}\n\n{{ $('Wait for Approval').item.json.body.hashtags }}", commitMessage: "Add generated caption text" },
      id: "gh_txt", name: "GitHub: Push Caption", type: "n8n-nodes-base.github", typeVersion: 1, position: [2000, 500],
      credentials: { githubOAuth2Api: { id: "your-github-credentials", name: "GitHub account" } }
    },
    {
      parameters: { chatId: "={{ $env.TELEGRAM_CHAT_ID }}", text: "=🎉 Content finalized and pushed to GitHub!\n\nCaption:\n{{ $('Wait for Approval').item.json.body.caption }}", additionalFields: {} },
      id: "tel_final", name: "Telegram: Final Delivery", type: "n8n-nodes-base.telegram", typeVersion: 1.1, position: [2200, 400],
      credentials: { telegramApi: { id: "your-telegram-credentials", name: "Telegram account" } }
    }
  ],
  connections: {
    "Start Webhook": { main: [ [ { node: "Telegram: Task Received", type: "main", index: 0 } ] ] },
    "Telegram: Task Received": { main: [ [ { node: "Set Prompt", type: "main", index: 0 } ] ] },
    
    "Set Prompt": { main: [ [ { node: "AI Agent (Unified)", type: "main", index: 0 } ] ] },
    "AI Agent (Unified)": { main: [ [ { node: "Hugging Face Image Gen", type: "main", index: 0 } ] ] },
    "Hugging Face Image Gen": { main: [ [ { node: "Send Draft to Dashboard", type: "main", index: 0 } ] ] },
    "Send Draft to Dashboard": { main: [ [ { node: "Wait for Approval", type: "main", index: 0 } ] ] },
    
    "Wait for Approval": { main: [ [ { node: "Check Action", type: "main", index: 0 } ] ] },
    
    "Check Action": {
      main: [
        [ { node: "Telegram: Regenerating", type: "main", index: 0 } ], // True path (Regenerate)
        [ { node: "Telegram: Approved", type: "main", index: 0 } ]       // False path (Approve)
      ]
    },
    
    "Telegram: Regenerating": { main: [ [ { node: "Set Prompt", type: "main", index: 0 } ] ] },
    
    "Telegram: Approved": { main: [ [ { node: "GitHub: Push Image", type: "main", index: 0 }, { node: "GitHub: Push Caption", type: "main", index: 0 } ] ] },
    "GitHub: Push Image": { main: [ [ { node: "Telegram: Final Delivery", type: "main", index: 0 } ] ] },
    "GitHub: Push Caption": { main: [ [ { node: "Telegram: Final Delivery", type: "main", index: 0 } ] ] },

    "Google Gemini": {
      ai_languageModel: [
        [ { node: "AI Agent (Unified)", type: "ai_languageModel", index: 0 } ]
      ]
    },
    "Output Parser": {
      ai_outputParser: [
        [ { node: "AI Agent (Unified)", type: "ai_outputParser", index: 0 } ]
      ]
    }
  },
  settings: {
    executionOrder: "v1",
    binaryMode: "separate"
  }
};

fs.writeFileSync('n8n-workflow-updated.json', JSON.stringify(workflow, null, 2));
console.log('n8n-workflow-updated.json generated successfully');
