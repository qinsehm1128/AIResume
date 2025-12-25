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
              {(content.title as string) || '职位名称'} - {(content.company as string) || '公司名称'}
            </h3>
            <p className="text-sm text-gray-500">
              {(content.start_date as string) || '开始时间'} - {(content.end_date as string) || '结束时间'}
            </p>
            <p className="mt-2 text-gray-700">{(content.description as string) || '工作描述'}</p>
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
              {(content.degree as string) || '学位'} · {(content.field as string) || '专业'}
            </h3>
            <p className="text-gray-600">{(content.institution as string) || '学校名称'}</p>
            <p className="text-sm text-gray-500">
              {(content.start_date as string) || '开始时间'} - {(content.end_date as string) || '结束时间'}
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
              {(content.name as string) || '项目名称'}
            </h3>
            <p className="mt-2 text-gray-700">{(content.description as string) || '项目描述'}</p>
            {content.technologies && (
              <p className="text-sm text-gray-500 mt-2">
                技术栈：{(content.technologies as string[]).join(', ')}
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
              {(content.category as string) || '技能类别'}
            </h3>
            <p className="text-gray-700">
              {(content.skills as string[])?.join(', ') || '技能列表'}
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
      {/* 头部信息 */}
      <div className="text-center border-b-2 pb-6 mb-6" style={{ borderColor: primaryColor }}>
        <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>
          {data.profile.name || '您的姓名'}
        </h1>
        <div className="text-gray-600 mt-2">
          {data.profile.email && <span>{data.profile.email}</span>}
          {data.profile.email && data.profile.phone && <span> | </span>}
          {data.profile.phone && <span>{data.profile.phone}</span>}
        </div>
      </div>

      {/* 个人简介 */}
      {data.profile.summary && (
        <div
          className="mb-6 p-4 bg-gray-50 border-l-4"
          style={{ borderColor: primaryColor }}
        >
          <p className="text-gray-700">{data.profile.summary}</p>
        </div>
      )}

      {/* 各个模块 */}
      <div className="space-y-4">
        {data.sections.map(renderSection)}
      </div>

      {data.sections.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <p>暂无内容。上传简历文档或让 AI 帮你创建内容。</p>
        </div>
      )}
    </div>
  );
}
