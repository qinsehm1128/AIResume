import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Resume, ChatMessage, LayoutConfig, ResumeData, ProfileData, SectionContent, DraggedNode, TemplateAST } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface ResumeState {
  currentResume: Resume | null;
  messages: ChatMessage[];
  focusedSectionId: string | null;
  draggedNode: DraggedNode | null;
  editMode: 'content' | 'layout' | 'template';
  setCurrentResume: (resume: Resume | null) => void;
  updateResumeData: (data: ResumeData) => void;
  updateProfile: (profile: Partial<ProfileData>) => void;
  updateSection: (sectionId: string, content: Partial<SectionContent>) => void;
  updateLayoutConfig: (config: LayoutConfig) => void;
  updateTemplateAst: (ast: TemplateAST | null) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setFocusedSection: (id: string | null) => void;
  setDraggedNode: (node: DraggedNode | null) => void;
  setEditMode: (mode: 'content' | 'layout' | 'template') => void;
}

export const useResumeStore = create<ResumeState>((set) => ({
  currentResume: null,
  messages: [],
  focusedSectionId: null,
  draggedNode: null,
  editMode: 'content',
  setCurrentResume: (resume) => set({ currentResume: resume, messages: [], draggedNode: null }),
  updateResumeData: (data) =>
    set((state) => ({
      currentResume: state.currentResume
        ? { ...state.currentResume, resume_data: data }
        : null,
    })),
  updateProfile: (profile) =>
    set((state) => {
      if (!state.currentResume) return state;
      return {
        currentResume: {
          ...state.currentResume,
          resume_data: {
            ...state.currentResume.resume_data,
            profile: { ...state.currentResume.resume_data.profile, ...profile },
          },
        },
      };
    }),
  updateSection: (sectionId, content) =>
    set((state) => {
      if (!state.currentResume) return state;
      const sections = state.currentResume.resume_data.sections.map((s) =>
        s.id === sectionId ? { ...s, content: { ...s.content, ...content } } : s
      );
      return {
        currentResume: {
          ...state.currentResume,
          resume_data: {
            ...state.currentResume.resume_data,
            sections,
          },
        },
      };
    }),
  updateLayoutConfig: (config) =>
    set((state) => ({
      currentResume: state.currentResume
        ? { ...state.currentResume, layout_config: config }
        : null,
    })),
  updateTemplateAst: (ast) =>
    set((state) => ({
      currentResume: state.currentResume
        ? { ...state.currentResume, template_ast: ast }
        : null,
    })),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  clearMessages: () => set({ messages: [] }),
  setFocusedSection: (id) => set({ focusedSectionId: id }),
  setDraggedNode: (node) => set({ draggedNode: node }),
  setEditMode: (mode) => set({ editMode: mode }),
}));
