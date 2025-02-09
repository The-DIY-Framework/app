import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';

interface AgentData {
  id: string;
  name: string;
  voiceId?: string;
  avatarUrl?: string;
  didApiKey: string;
  chatId?: string;
  instructions?: string;
  idle_video?: string;
}

const AVATAR_DIMENSIONS = {
  width: 640,
  height: 360
};

const AgentInteraction = () => {
  const { id } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing');
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [idleImage, setIdleImage] = useState<string>('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // WebRTC-related refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const streamIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const lastBytesReceivedRef = useRef<number>(0);
  const videoIsPlayingRef = useRef<boolean>(false);
  const statsIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (message: string) => {
    if (!agentData?.id || !agentData?.chatId) {
      setError('Missing agent information');
      return;
    }

    if (!streamIdRef.current || !sessionIdRef.current) {
      setError('Connection not established');
      return;
    }

    try {
      setHasInteracted(true);
      setMessages(prev => [...prev, `You: ${message}`]);

      const response = await fetch(`https://api.d-id.com/agents/${agentData.id}/chat/${agentData.chatId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${agentData.didApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: streamIdRef.current,
          sessionId: sessionIdRef.current,
          messages: [{
            role: 'user',
            content: message,
            created_at: new Date().toString()
          }]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      // Add agent's response to messages immediately
      if (data.response?.content || data.output?.content) {
        setMessages(prev => [...prev, `${agentData.name || 'Agent'}: ${data.response?.content || data.output?.content}`]);
      }

    } catch (error) {
      console.error('Message send error:', error);
      setError('Failed to send message');
    }
  }, [agentData]);

  const createPeerConnection = async (offer: RTCSessionDescriptionInit, iceServers: RTCIceServer[]) => {
    if (peerConnectionRef.current) {
      console.log('Closing existing peer connection');
      peerConnectionRef.current.close();
    }

    console.log('Creating new peer connection with ICE servers:', iceServers);
    const pc = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current = pc;

    pc.addEventListener('icegatheringstatechange', () => {
      console.log('ICE gathering state:', pc.iceGatheringState);
      if (pc.iceGatheringState === 'complete') {
        console.log('ICE gathering completed');
      }
    });

    pc.addEventListener('iceconnectionstatechange', () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        setIsReconnecting(false);
        setIsConnected(true);
        setConnectionStatus('Connected');
      } else {
        setConnectionStatus(`Connection: ${pc.iceConnectionState}`);
        if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState) && !isReconnecting) {
          console.log('ICE connection issue, reconnecting...');
          handleReconnection();
        }
      }
    });

    pc.addEventListener('connectionstatechange', () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsReconnecting(false);
        setIsConnected(true);
        setConnectionStatus('Connected');
      } else {
        setConnectionStatus(`State: ${pc.connectionState}`);
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState) && !isReconnecting) {
          console.log('Connection lost, reconnecting...');
          handleReconnection();
        }
      }
    });

    pc.addEventListener('track', (event) => {
      console.log('Received track:', event.track.kind);
      if (videoRef.current && event.streams[0]) {
        console.log('Setting video source');
        videoRef.current.srcObject = event.streams[0];
        setIsVideoPlaying(true);
      }
    });

    // Create data channel
    const dataChannel = pc.createDataChannel('JanusDataChannel');
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log('Data channel opened');
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionStatus('Connected');
    };

    dataChannel.onclose = () => {
      console.log('Data channel closed');
      setIsConnected(false);
      if (!isReconnecting) {
        setConnectionStatus('Disconnected');
        handleReconnection();
      }
    };

    dataChannel.onmessage = (event) => {
      const msg = event.data;
      console.log('Data channel message:', msg);

      if (msg.includes('chat/answer:')) {
        const answer = decodeURIComponent(msg.replace('chat/answer:', ''));
        const agentName = agentData?.name || 'Agent';
        setMessages(prev => [...prev, `${agentName}: ${answer}`]);
        setHasInteracted(true);
      } else if (msg.includes('stream/started')) {
        setIsVideoPlaying(true);
        setIsStreamReady(true);
      } else if (msg.includes('stream/ended')) {
        setIsVideoPlaying(false);
      }
    };

    try {
      console.log('Setting remote description');
      await pc.setRemoteDescription(offer);
      
      console.log('Creating answer');
      const answer = await pc.createAnswer();
      
      console.log('Setting local description');
      await pc.setLocalDescription(answer);

      return answer;
    } catch (error) {
      console.error('Error in peer connection setup:', error);
      throw error;
    }
  };

  const handleReconnection = useCallback(() => {
    setIsReconnecting(true);
    setIsConnected(false);
    setIsVideoPlaying(false);
    setIsStreamReady(false);
    setConnectionStatus('Reconnecting...');
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Attempting reconnection...');
        if (agentData) {
          await initializeConnection(agentData);
        }
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        if (!isConnected) {
          console.log('Still disconnected, trying again...');
          handleReconnection();
        }
      }
    }, 3000);
  }, [agentData, isConnected]);

  const initializeConnection = async (agentData: AgentData) => {
    try {
      setConnectionStatus('Initializing connection...');
      console.log('Initializing connection for agent:', agentData.id);
      const defaultImage = 'https://create-images-results.d-id.com/DefaultPresenters/Emma_f/v1_image.jpeg';
      setIdleImage(agentData.avatarUrl || defaultImage);

      console.log('Creating stream...');
      const streamResponse = await fetch('https://api.d-id.com/talks/streams', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${agentData.didApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_url: agentData.avatarUrl || defaultImage
        })
      });

      if (!streamResponse.ok) {
        const errorText = await streamResponse.text();
        console.error('Stream creation failed:', errorText);
        throw new Error(`Failed to create stream: ${errorText}`);
      }

      const streamData = await streamResponse.json();
      console.log('Stream created:', streamData);

      streamIdRef.current = streamData.id;
      sessionIdRef.current = streamData.session_id;

      setConnectionStatus('Creating peer connection...');
      const answer = await createPeerConnection(streamData.offer, streamData.ice_servers);

      console.log('Setting SDP...');
      const sdpResponse = await fetch(`https://api.d-id.com/talks/streams/${streamData.id}/sdp`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${agentData.didApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answer,
          session_id: streamData.session_id
        })
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('SDP setup failed:', errorText);
        throw new Error(`Failed to set SDP: ${errorText}`);
      }

      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }

      statsIntervalRef.current = window.setInterval(async () => {
        const pc = peerConnectionRef.current;
        if (!pc || !videoRef.current) return;

        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            const videoStatusChanged = videoIsPlayingRef.current !== report.bytesReceived > lastBytesReceivedRef.current;
            if (videoStatusChanged) {
              videoIsPlayingRef.current = report.bytesReceived > lastBytesReceivedRef.current;
              setIsVideoPlaying(videoIsPlayingRef.current);
            }
            lastBytesReceivedRef.current = report.bytesReceived;
          }
        });
      }, 500);

      console.log('Connection initialized successfully');
    } catch (error) {
      console.error('Connection initialization error:', error);
      setError('Failed to establish connection');
      throw error;
    }
  };

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        const response = await fetch(`/api/agent/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch agent data');
        }
        const data = await response.json();
        setAgentData(data);
        await initializeConnection(data);
      } catch (error) {
        console.error('Failed to initialize agent:', error);
        setError('Failed to load agent data');
      }
    };

    if (id) {
      fetchAgentData();
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
      }
    };
  }, [id]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="aspect-video relative bg-black">
          {(!isVideoPlaying) && (
            agentData?.idle_video ? (
              <video 
                src={agentData.idle_video}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            ) : idleImage && (
              <img 
                src={idleImage} 
                alt={`${agentData?.name || 'Agent'} idle`}
                className="w-full h-full object-contain"
              />
            )
          )}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            className={`w-full h-full object-contain absolute top-0 left-0 ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
          />
          {isReconnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <div className="text-center">
                <div className="mb-2">Reconnecting...</div>
                <div className="text-sm opacity-75">{connectionStatus}</div>
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2 px-3 py-1 rounded bg-black/50 text-white text-sm">
            {connectionStatus}
          </div>
        </div>

        <div className="h-64 overflow-y-auto p-4 bg-gray-50">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`p-2 rounded-lg mb-2 ${
                msg.startsWith('You:') ? 'bg-blue-50 ml-auto' : 'bg-white'
              } max-w-[80%] ${msg.startsWith('You:') ? 'ml-auto' : 'mr-auto'}`}
            >
              {msg}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <Input 
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement;
                const message = input.value.trim();
                if (message) {
                  sendMessage(message);
                  input.value = '';
                }
              }
            }}
          />
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Connection Status: {connectionStatus}</p>
          {isReconnecting && <p className="text-sm text-gray-600">Attempting to reconnect...</p>}
        </div>
      )}
    </div>
  );
};

export default AgentInteraction;