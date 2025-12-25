export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  summary: string;
}

export interface SectionContent {
  [key: string]: string | string[] | undefined;
}

export interface SectionData {
  id: string;
  type: 'experience' | 'education' | 'project' | 'skill';
  content: SectionContent;
}

export interface ResumeData {
  profile: ProfileData;
  sections: SectionData[];
}

export interface LayoutConfig {
  theme: string;
  column_layout: string;
  font_size: string;
  primary_color: string;
}

export interface Resume {
  id: number;
  title: string;
  resume_data: ResumeData;
  layout_config: LayoutConfig;
  created_at: string;
  updated_at: string;
}

export interface ResumeVersion {
  id: number;
  version_number: number;
  resume_data: ResumeData;
  layout_config: LayoutConfig;
  created_at: string;
}

export interface LLMConfig {
  id: number;
  base_url: string | null;
  model_name: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  resume_data: ResumeData | null;
  layout_config: LayoutConfig | null;
  action_type: 'message' | 'content_update' | 'layout_update';
}
