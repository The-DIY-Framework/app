import express from 'express';
import { DID_API_KEY } from '../config';

const router = express.Router();

router.get('/:agentId', async (req, res) => {
  try {
    const agentId = req.params.agentId;
    
    const agentResponse = await fetch(`https://api.d-id.com/agents/${agentId}`, {
      headers: {
        'Authorization': `Basic ${DID_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!agentResponse.ok) {
      throw new Error('Failed to fetch agent');
    }

    const agentData = await agentResponse.json();

    // Create a new chat session
    const chatResponse = await fetch(`https://api.d-id.com/agents/${agentId}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${DID_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!chatResponse.ok) {
      throw new Error('Failed to create chat session');
    }

    const chatData = await chatResponse.json();

    // Prepare agent data
    const responseData = {
      id: agentId,
      name: agentData.preview_name || 'Unnamed Agent',
      voiceId: agentData.presenter?.voice?.voice_id,
      avatarUrl: agentData.presenter?.source_url,
      didApiKey: DID_API_KEY,
      chatId: chatData.id,
      instructions: agentData.llm?.instructions,
      status: agentData.status
    };

    res.json(responseData);
  } catch (error) {
    console.error('Agent fetch error:', error);
    res.status(404).json({ error: 'Agent not found or error fetching agent data' });
  }
});

export default router;