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
  // 基础设置
  theme: string;
  column_layout: string;
  font_size: string;
  primary_color: string;

  // 扩展样式 - 间距
  section_spacing?: string;
  line_height?: string;

  // 扩展样式 - 边框和圆角
  border_style?: string;
  border_radius?: string;

  // 扩展样式 - 背景和阴影
  background_color?: string;
  header_background?: string;
  shadow?: string;

  // 扩展样式 - 字体
  font_family?: string;
  header_font_size?: string;

  // 扩展样式 - 布局风格
  header_alignment?: string;
  section_style?: string;
  accent_style?: string;
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
