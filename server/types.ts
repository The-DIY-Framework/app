export interface DIDVoice {
  id: string;
  name: string;
  gender: string;
  languages: DIDLanguage[];
  access: string;
  provider: string;
  styles: string[];
}

export interface DIDLanguage {
  locale: string;
  language: string;
  config?: {
    modelId: string;
    availableModels?: string[];
  };
}

export interface AgentCreationResponse {
  id: string;
  preview_name: string;
}