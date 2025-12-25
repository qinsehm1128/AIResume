import type { ResumeData, LayoutConfig, SectionData } from '../types';
import { useResumeStore } from '../store';

interface Props {
  data: ResumeData;
  layout: LayoutConfig;
  onSectionClick: (id: string) => void;
}

const themeColors: Record<string, string> = {
  'modern-blue': '#2563eb',
  'classic-black': '#1f2937',
  'minimal-gray': '#6b7280',
  'creative-purple': '#7c3aed',
};

export default function ResumePreview({ data, layout, onSectionClick }: Props) {
  const focusedSectionId = useResumeStore((state) => state.focusedSectionId);
  const primaryColor = layout.primary_color || themeColors[layout.theme] || '#2563eb';

  const renderSection = (section: SectionData) => {
    const isActive = focusedSectionId === section.id;
    const content = section.content || {};

    const baseClasses = `p-4 rounded-lg cursor-pointer transition ${
      isActive ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
    }`;

    switch (section.type) {
      case 'experience':
        return (
          <div
            key={section.id}
            className={baseClasses}
            onClick={() => onSectionClick(section.id)}
          >
            <h3 className="font-semibold" style={{ color: primaryColor }}>
              {(content.title as string) || 'Job Title'} - {(content.company as string) || 'Company'}
            </h3>
            <p className="text-sm text-gray-500">
              {(content.start_date as string) || 'Start'} - {(content.end_date as string) || 'End'}
            </p>
            <p className="mt-2 text-gray-700">{(content.description as string) || 'Description'}</p>
          </div>
        );

      case 'education':
        return (
          <div
            key={section.id}
            className={baseClasses}
            onClick={() => onSectionClick(section.id)}
          >
            <h3 className="font-semibold" style={{ color: primaryColor }}>
              {(content.degree as string) || 'Degree'} in {(content.field as string) || 'Field'}
            </h3>
            <p className="text-gray-600">{(content.institution as string) || 'Institution'}</p>
            <p className="text-sm text-gray-500">
              {(content.start_date as string) || 'Start'} - {(content.end_date as string) || 'End'}
            </p>
          </div>
        );

      case 'project':
        return (
          <div
            key={section.id}
            className={baseClasses}
            onClick={() => onSectionClick(section.id)}
          >
            <h3 className="font-semibold" style={{ color: primaryColor }}>
              {(content.name as string) || 'Project Name'}
            </h3>
            <p className="mt-2 text-gray-700">{(content.description as string) || 'Description'}</p>
            {content.technologies && (
              <p className="text-sm text-gray-500 mt-2">
                Tech: {(content.technologies as string[]).join(', ')}
              </p>
            )}
          </div>
        );

      case 'skill':
        return (
          <div
            key={section.id}
            className={baseClasses}
            onClick={() => onSectionClick(section.id)}
          >
            <h3 className="font-semibold" style={{ color: primaryColor }}>
              {(content.category as string) || 'Category'}
            </h3>
            <p className="text-gray-700">
              {(content.skills as string[])?.join(', ') || 'Skills'}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="bg-white shadow-lg rounded-lg p-8 max-w-2xl mx-auto"
      style={{ fontSize: layout.font_size }}
    >
      {/* Header */}
      <div className="text-center border-b-2 pb-6 mb-6" style={{ borderColor: primaryColor }}>
        <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>
          {data.profile.name || 'Your Name'}
        </h1>
        <div className="text-gray-600 mt-2">
          {data.profile.email && <span>{data.profile.email}</span>}
          {data.profile.email && data.profile.phone && <span> | </span>}
          {data.profile.phone && <span>{data.profile.phone}</span>}
        </div>
      </div>

      {/* Summary */}
      {data.profile.summary && (
        <div
          className="mb-6 p-4 bg-gray-50 border-l-4"
          style={{ borderColor: primaryColor }}
        >
          <p className="text-gray-700">{data.profile.summary}</p>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {data.sections.map(renderSection)}
      </div>

      {data.sections.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <p>No sections yet. Upload a resume or ask AI to help create content.</p>
        </div>
      )}
    </div>
  );
}
