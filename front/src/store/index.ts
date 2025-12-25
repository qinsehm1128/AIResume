import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Resume, ChatMessage, LayoutConfig, ResumeData, ProfileData, SectionContent } from '../types';

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
  setCurrentResume: (resume: Resume | null) => void;
  updateResumeData: (data: ResumeData) => void;
  updateProfile: (profile: Partial<ProfileData>) => void;
  updateSection: (sectionId: string, content: Partial<SectionContent>) => void;
  updateLayoutConfig: (config: LayoutConfig) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setFocusedSection: (id: string | null) => void;
}

export const useResumeStore = create<ResumeState>((set) => ({
  currentResume: null,
  messages: [],
  focusedSectionId: null,
  setCurrentResume: (resume) => set({ currentResume: resume, messages: [] }),
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
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  clearMessages: () => set({ messages: [] }),
  setFocusedSection: (id) => set({ focusedSectionId: id }),
}));
