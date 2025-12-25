import axios from 'axios';
import type { Resume, ResumeVersion, LLMConfig, ChatResponse, ResumeData, Template, TemplateAST, DraggedNode } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth
export const login = async (password: string) => {
  const response = await api.post('/auth/login', { password });
  return response.data;
};

// LLM Config
export const getLLMConfig = async (): Promise<LLMConfig | null> => {
  const response = await api.get('/llm-config');
  return response.data;
};

export const saveLLMConfig = async (config: {
  base_url?: string;
  api_key?: string;
  model_name: string;
}): Promise<LLMConfig> => {
  const response = await api.post('/llm-config', config);
  return response.data;
};

// Resumes
export const listResumes = async (): Promise<Resume[]> => {
  const response = await api.get('/resumes');
  return response.data;
};

export const getResume = async (id: number): Promise<Resume> => {
  const response = await api.get(`/resumes/${id}`);
  return response.data;
};

export const createResume = async (options?: {
  title?: string;
  template_id?: number;
  generate_template_prompt?: string;
}): Promise<Resume> => {
  const response = await api.post('/resumes', {
    title: options?.title || 'Untitled Resume',
    template_id: options?.template_id,
    generate_template_prompt: options?.generate_template_prompt,
  });
  return response.data;
};

export const updateResume = async (
  id: number,
  data: Partial<Resume> & { create_version?: boolean }
): Promise<Resume> => {
  const response = await api.put(`/resumes/${id}`, data);
  return response.data;
};

export const deleteResume = async (id: number): Promise<void> => {
  await api.delete(`/resumes/${id}`);
};

export const listVersions = async (resumeId: number): Promise<ResumeVersion[]> => {
  const response = await api.get(`/resumes/${resumeId}/versions`);
  return response.data;
};

export const restoreVersion = async (
  resumeId: number,
  versionId: number
): Promise<Resume> => {
  const response = await api.post(`/resumes/${resumeId}/restore/${versionId}`);
  return response.data;
};

// Chat
export const sendChatMessage = async (
  resumeId: number,
  message: string,
  focusedSectionId?: string
): Promise<ChatResponse> => {
  const response = await api.post('/chat', {
    resume_id: resumeId,
    message,
    focused_section_id: focusedSectionId,
  });
  return response.data;
};

// Upload
export const uploadDocument = async (file: File): Promise<ResumeData> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload/parse', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Image Upload
export interface ImageUploadResponse {
  success: boolean;
  filename: string;
  url: string;
  base64: string;
  mime_type: string;
}

export const uploadImage = async (file: File): Promise<ImageUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Export
export const exportPDF = async (resumeId: number): Promise<Blob> => {
  const response = await api.get(`/export/${resumeId}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

// Templates
export const listTemplates = async (): Promise<Template[]> => {
  const response = await api.get('/templates');
  return response.data;
};

export const getTemplate = async (id: number): Promise<Template> => {
  const response = await api.get(`/templates/${id}`);
  return response.data;
};

export const createTemplate = async (data: {
  name: string;
  description?: string;
  ast?: TemplateAST;
}): Promise<Template> => {
  const response = await api.post('/templates', data);
  return response.data;
};

export const updateTemplate = async (
  id: number,
  data: Partial<Template>
): Promise<Template> => {
  const response = await api.put(`/templates/${id}`, data);
  return response.data;
};

export const deleteTemplate = async (id: number): Promise<void> => {
  await api.delete(`/templates/${id}`);
};

export const generateTemplate = async (prompt: string, baseTemplateId?: number): Promise<Template> => {
  const response = await api.post('/templates/generate', {
    prompt,
    base_template_id: baseTemplateId,
  });
  return response.data;
};

export const parseHtmlToAst = async (htmlContent: string, cssContent?: string): Promise<{ ast: TemplateAST }> => {
  const response = await api.post('/templates/parse', {
    html_content: htmlContent,
    css_content: cssContent || '',
  });
  return response.data;
};

// Extended Chat with drag and image support
export interface ImageData {
  base64: string;
  mime_type: string;
  url?: string;
}

export const sendChatMessageWithContext = async (
  resumeId: number,
  message: string,
  options?: {
    focusedSectionId?: string;
    draggedNode?: DraggedNode;
    editMode?: 'content' | 'layout' | 'template';
    images?: ImageData[];
  }
): Promise<ChatResponse> => {
  const response = await api.post('/chat', {
    resume_id: resumeId,
    message,
    focused_section_id: options?.focusedSectionId,
    dragged_node_id: options?.draggedNode?.id,
    dragged_node_path: options?.draggedNode?.path,
    edit_mode: options?.editMode || 'content',
    images: options?.images || [],
  });
  return response.data;
};
