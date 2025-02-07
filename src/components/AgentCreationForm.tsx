import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface FormData {
  name: string;
  avatar?: File;
  gender: string;
  language: string;
  style: string;
  personality: string;
  knowledgeBase?: File;
  additionalInfo: string;
}

const AgentCreationForm = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    gender: '',
    language: '',
    style: '',
    personality: '',
    additionalInfo: ''
  });
  
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-8">
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
                />
                {previewUrl && (
                  <div className="mt-4">
                    <img src={previewUrl} alt="Avatar preview" className="w-32 h-32 object-cover rounded" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="german">German</SelectItem>
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
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
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
          </CardContent>
        </Card>

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
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFormData({...formData, knowledgeBase: file});
                  }
                }}
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

            <Button type="submit" className="w-full bg-black hover:bg-gray-800">
              Do it
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default AgentCreationForm;