import axios from 'axios';
import type { Resume, ResumeVersion, LLMConfig, ChatResponse, ResumeData } from '../types';

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

export const createResume = async (title: string = 'Untitled Resume'): Promise<Resume> => {
  const response = await api.post('/resumes', { title });
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

// Export
export const exportPDF = async (resumeId: number): Promise<Blob> => {
  const response = await api.get(`/export/${resumeId}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};
