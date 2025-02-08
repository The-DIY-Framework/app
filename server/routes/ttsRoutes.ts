import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadToCloudinary } from '../utils/cloudinary';
import { DID_API_KEY } from '../config';

const router = express.Router();

const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/voices', async (req, res) => {
  try {
    const response = await fetch('https://api.d-id.com/tts/voices', {
      headers: {
        'Authorization': `Basic ${DID_API_KEY}`,
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch voices');
    
    const voices = await response.json();
    res.json({ voices });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

router.post('/createAgent', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'knowledgeBase', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, gender, language, style, personality, voice, additionalInstructions } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    let avatarUrl = '';
    if (files['avatar']) {
      avatarUrl = await uploadToCloudinary(files['avatar'][0].path);
    }

    let knowledgeBaseUrl = '';
    if (files['knowledgeBase']) {
      knowledgeBaseUrl = await uploadToCloudinary(files['knowledgeBase'][0].path);
    }

    const knowledgeResponse = await fetch('https://api.d-id.com/knowledge', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${DID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${name}_knowledge`,
        description: `Knowledge base for agent ${name}`
      })
    });

    if (!knowledgeResponse.ok) throw new Error('Failed to create knowledge base');
    
    const knowledgeData = await knowledgeResponse.json();

    if (knowledgeBaseUrl) {
      await fetch(`https://api.d-id.com/knowledge/${knowledgeData.id}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${DID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: knowledgeBaseUrl })
      });
    }

    const agentResponse = await fetch('https://api.d-id.com/agents', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${DID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        knowledge: {
          provider: 'pinecone',
          embedder: {
            provider: 'azure-open-ai',
            model: 'text-large-003'
          },
          id: knowledgeData.id
        },
        presenter: {
          type: 'talk',
          voice: {
            type: 'microsoft',
            voice_id: voice
          },
          thumbnail: avatarUrl,
          source_url: avatarUrl
        },
        llm: {
          type: 'openai',
          provider: 'openai',
          model: 'gpt-3.5-turbo-1106',
          instructions: `Your name is ${name}. You are a ${personality.toLowerCase()} ${gender.toLowerCase()} agent. Speak in a ${style.toLowerCase()} tone. ${additionalInstructions}`,
          template: 'rag-ungrounded'
        },
        preview_name: name
      })
    });

    if (!agentResponse.ok) throw new Error('Failed to create agent');
    
    const agentData = await agentResponse.json();
    res.status(201).json(agentData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;