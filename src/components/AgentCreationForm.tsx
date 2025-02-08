import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import * as faceapi from 'face-api.js';

interface DIDVoice {
  id: string;
  name: string;
  gender: string;
  languages: Array<{
    locale: string;
    language: string;
  }>;
  access: string;
  provider: string;
  styles: string[];
}

interface FormData {
  name: string;
  gender: string;
  language: string;
  style: string;
  personality: string;
  voice: string;
  additionalInfo: string;
  avatar?: File;
  knowledgeBase?: File;
}

const AgentCreationForm = () => {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    gender: '',
    language: '',
    style: '',
    personality: '',
    voice: '',
    additionalInfo: ''
  });

  // UI state
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [voices, setVoices] = useState<DIDVoice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<DIDVoice[]>([]);

  // Initialize face detection and fetch voices
  useEffect(() => {
    const initialize = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await fetchVoices();
      } catch (error) {
        console.error('Initialization error:', error);
        setError('Failed to initialize. Please refresh the page.');
      }
    };

    initialize();
  }, []);

  // Filter voices when criteria changes
  useEffect(() => {
    if (!formData.gender || !formData.language || !formData.style) return;

    const filtered = voices.filter(voice => {
      const genderMatch = formData.gender === 'neutral' ? true : voice.gender.toLowerCase() === formData.gender.toLowerCase();
      const languageMatch = voice.languages.some(lang => lang.locale.toLowerCase() === formData.language.toLowerCase());
      const styleMatch = voice.styles.length === 0 || voice.styles.includes(formData.style.toLowerCase());
      
      return genderMatch && languageMatch && styleMatch;
    });

    setFilteredVoices(filtered);
  }, [formData.gender, formData.language, formData.style, voices]);

  const getAvailableLanguages = (voices: DIDVoice[]) => {
    const languageSet = new Set<string>();

    voices.forEach((voice) => {
      voice.languages.forEach((lang) => {
        languageSet.add(lang.locale);
      });
    });

    const languageDisplayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const regionDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });

    return Array.from(languageSet).sort().map(locale => {
      const [language, region] = locale.split('-');
      const languageName = languageDisplayNames.of(language) || language;
      
      let regionName = '';
      if (region) {
        try {
          regionName = regionDisplayNames.of(region) || region;
        } catch (error) {
          console.warn(`Invalid region code "${region}" for locale "${locale}"`);
          regionName = region;
        }
      }

      return {
        value: locale,
        label: regionName ? `${languageName} (${regionName})` : languageName
      };
    });
  };

  const getAvailableStyles = (voices: DIDVoice[]) => {
    const styleSet = new Set<string>();

    voices.forEach((voice) => {
      voice.styles.forEach((style) => {
        styleSet.add(style.toLowerCase());
      });
    });

    return Array.from(styleSet).sort().map(style => ({
      value: style,
      label: style.charAt(0).toUpperCase() + style.slice(1)
    }));
  };

  const fetchVoices = async () => {
    try {
      const response = await fetch('/api/tts/voices');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch voices');
      }
      
      const data = await response.json();
      if (!Array.isArray(data.voices)) {
        throw new Error('Invalid response format');
      }
      
      const microsoftVoices = data.voices.filter(
        (voice: DIDVoice) => voice.provider.toLowerCase() === 'microsoft'
      );
      setVoices(microsoftVoices);
      setFilteredVoices(microsoftVoices);
    } catch (error) {
      console.error('Error fetching voices:', error);
      setError('Failed to load voices. Please try again later.');
    }
  };

  const createImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'spawn_imgs');
    formData.append('cloud_name', 'dmlpeujlz');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dmlpeujlz/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) throw new Error('Failed to upload image');

    const data = await response.json();
    return data.secure_url;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError('');
    
    if (file) {
      try {
        const img = await createImage(file);
        const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions());

        if (detections.length === 0) {
          setError('No face detected. Please try another photo.');
          return;
        }

        const cloudinaryUrl = await uploadToCloudinary(file);
        setPreviewUrl(cloudinaryUrl);
        setFormData(prev => ({ ...prev, avatar: file }));
      } catch (error) {
        console.error('File processing error:', error);
        setError('Error processing image. Please try again.');
      }
    }
  };

  const handleKnowledgeBaseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, knowledgeBase: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof File) {
          formDataToSend.append(key, value);
        } else {
          formDataToSend.append(key, String(value));
        }
      });

      const response = await fetch('/api/tts/createAgent', {
        method: 'POST',
        body: formDataToSend
      });

      if (!response.ok) throw new Error('Failed to create agent');

      const data = await response.json();
      window.location.href = `/agent/${data.id}`;
    } catch (error) {
      console.error('Submission error:', error);
      setError('Failed to create agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md">
            {error}
          </div>
        )}

        {/* Step 1: Identity */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">1</span>
                <div>
                  <div className="text-xl">Identity and Visual Representation</div>
                  <div className="text-sm text-gray-500">STEP 1 of 3</div>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Agent Name</Label>
                <Input 
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Select Avatar</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-2"
                  required
                />
                {previewUrl && (
                  <div className="mt-4">
                    <img 
                      src={previewUrl} 
                      alt="Avatar preview" 
                      className="w-32 h-32 object-cover rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Communication */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">2</span>
                <div>
                  <div className="text-xl">Communication and Personality</div>
                  <div className="text-sm text-gray-500">STEP 2 of 3</div>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Agent Gender</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(value) => setFormData({...formData, gender: value})}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="neutral" id="neutral" />
                    <Label htmlFor="neutral">Neutral</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label>Language</Label>
                <Select 
                  value={formData.language}
                  onValueChange={(value) => setFormData({...formData, language: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableLanguages(voices).map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Tone or Style</Label>
                <Select 
                  value={formData.style}
                  onValueChange={(value) => setFormData({...formData, style: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Tone or Style" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableStyles(voices).map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Personality</Label>
                <Select 
                  value={formData.personality}
                  onValueChange={(value) => setFormData({...formData, personality: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Personality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="humorous">Humorous</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="empathetic">Empathetic</SelectItem>
                    <SelectItem value="supportive">Supportive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Voice</Label>
              <Select 
                value={formData.voice}
                onValueChange={(value) => setFormData({...formData, voice: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Voice" />
                </SelectTrigger>
                <SelectContent>
                  {filteredVoices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} ({voice.gender})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Knowledge */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">3</span>
                <div>
                  <div className="text-xl">Knowledge and Capabilities</div>
                  <div className="text-sm text-gray-500">STEP 3 of 3</div>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Upload Knowledge Base</Label>
              <Input
                type="file"
                accept=".txt,.pdf,.docx,.json"
                onChange={handleKnowledgeBaseUpload}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: .txt, .pdf, .docx, .json
              </p>
            </div>

            <div>
              <Label htmlFor="additionalInfo">More Instructions</Label>
              <Textarea
                id="additionalInfo"
                value={formData.additionalInfo}
                onChange={(e) => setFormData({...formData, additionalInfo: e.target.value})}
                placeholder="[Optional] Type here to share any additional context or instruction"
                className="mt-2"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-black hover:bg-gray-800"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Agent...' : 'Spawn'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default AgentCreationForm;