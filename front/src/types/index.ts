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
  template_ast?: TemplateAST | null;
  action_type: 'message' | 'content_update' | 'layout_update' | 'template_update';
}

// ==================== Template AST Types ====================

export interface ASTNodeStyle {
  display?: string;
  flex_direction?: string;
  justify_content?: string;
  align_items?: string;
  gap?: string;
  grid_template_columns?: string;
  width?: string;
  height?: string;
  max_width?: string;
  min_height?: string;
  padding?: string;
  margin?: string;
  background?: string;
  border?: string;
  border_radius?: string;
  box_shadow?: string;
  font_size?: string;
  font_weight?: string;
  font_family?: string;
  color?: string;
  text_align?: string;
  line_height?: string;
  position?: string;
  top?: string;
  left?: string;
  z_index?: string;
  [key: string]: string | undefined;
}

export interface ASTNode {
  id: string;
  type: string;
  tag: string;
  class_name?: string;
  styles?: ASTNodeStyle;
  content?: string;
  data_path?: string;
  children?: ASTNode[];
  editable?: boolean;
  draggable?: boolean;
  repeat?: string;
}

export interface TemplateAST {
  version: string;
  root: ASTNode;
  variables: Record<string, string>;
  global_styles?: string;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  ast: TemplateAST;
  thumbnail: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface DraggedNode {
  id: string;
  path: string;
  type: string;
  content?: string;
}
