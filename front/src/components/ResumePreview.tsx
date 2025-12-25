import { useState } from 'react';
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

// 可编辑文本组件
function EditableText({
  value,
  onChange,
  className = '',
  placeholder = '',
  multiline = false,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
    if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full p-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${className}`}
          rows={3}
          autoFocus
        />
      );
    }
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full p-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={() => {
        setEditValue(value);
        setIsEditing(true);
      }}
      className={`cursor-text hover:bg-blue-50 rounded px-1 -mx-1 ${className}`}
      title="点击编辑"
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
    </span>
  );
}

export default function ResumePreview({ data, layout, onSectionClick }: Props) {
  const focusedSectionId = useResumeStore((state) => state.focusedSectionId);
  const updateProfile = useResumeStore((state) => state.updateProfile);
  const updateSection = useResumeStore((state) => state.updateSection);

  const primaryColor = layout.primary_color || themeColors[layout.theme] || '#2563eb';

  const renderSection = (section: SectionData) => {
    const isActive = focusedSectionId === section.id;
    const content = section.content || {};

    const baseClasses = `p-4 rounded-lg cursor-pointer transition ${
      isActive ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
    }`;

    const handleContentChange = (field: string, value: string | string[]) => {
      updateSection(section.id, { [field]: value });
    };

    switch (section.type) {
      case 'experience':
        return (
          <div
            key={section.id}
            className={baseClasses}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                onSectionClick(section.id);
              }
            }}
          >
            <h3 className="font-semibold" style={{ color: primaryColor }}>
              <EditableText
                value={(content.title as string) || ''}
                onChange={(v) => handleContentChange('title', v)}
                placeholder="职位名称"
              />
              {' - '}
              <EditableText
                value={(content.company as string) || ''}
                onChange={(v) => handleContentChange('company', v)}
                placeholder="公司名称"
              />
            </h3>
            <p className="text-sm text-gray-500">
              <EditableText
                value={(content.start_date as string) || ''}
                onChange={(v) => handleContentChange('start_date', v)}
                placeholder="开始时间"
              />
              {' - '}
              <EditableText
                value={(content.end_date as string) || ''}
                onChange={(v) => handleContentChange('end_date', v)}
                placeholder="结束时间"
              />
            </p>
            <div className="mt-2 text-gray-700">
              <EditableText
                value={(content.description as string) || ''}
                onChange={(v) => handleContentChange('description', v)}
                placeholder="工作描述"
                multiline
              />
            </div>
          </div>
        );

      case 'education':
        return (
          <div
            key={section.id}
            className={baseClasses}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                onSectionClick(section.id);
              }
            }}
          >
            <h3 className="font-semibold" style={{ color: primaryColor }}>
              <EditableText
                value={(content.degree as string) || ''}
                onChange={(v) => handleContentChange('degree', v)}
                placeholder="学位"
              />
              {content.field && ' · '}
              <EditableText
                value={(content.field as string) || ''}
                onChange={(v) => handleContentChange('field', v)}
                placeholder="专业"
              />
            </h3>
            <p className="text-gray-600">
              <EditableText
                value={(content.institution as string) || ''}
                onChange={(v) => handleContentChange('institution', v)}
                placeholder="学校名称"
              />
            </p>
            <p className="text-sm text-gray-500">
              <EditableText
                value={(content.start_date as string) || ''}
                onChange={(v) => handleContentChange('start_date', v)}
                placeholder="开始时间"
              />
              {' - '}
              <EditableText
                value={(content.end_date as string) || ''}
                onChange={(v) => handleContentChange('end_date', v)}
                placeholder="结束时间"
              />
            </p>
          </div>
        );

      case 'project':
        return (
          <div
            key={section.id}
            className={baseClasses}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                onSectionClick(section.id);
              }
            }}
          >
            <h3 className="font-semibold" style={{ color: primaryColor }}>
              <EditableText
                value={(content.name as string) || ''}
                onChange={(v) => handleContentChange('name', v)}
                placeholder="项目名称"
              />
            </h3>
            <div className="mt-2 text-gray-700">
              <EditableText
                value={(content.description as string) || ''}
                onChange={(v) => handleContentChange('description', v)}
                placeholder="项目描述"
                multiline
              />
            </div>
            {content.technologies && (
              <p className="text-sm text-gray-500 mt-2">
                技术栈：
                <EditableText
                  value={(content.technologies as string[])?.join(', ') || ''}
                  onChange={(v) => handleContentChange('technologies', v.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="技术栈（用逗号分隔）"
                />
              </p>
            )}
          </div>
        );

      case 'skill':
        return (
          <div
            key={section.id}
            className={baseClasses}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                onSectionClick(section.id);
              }
            }}
          >
            <h3 className="font-semibold" style={{ color: primaryColor }}>
              <EditableText
                value={(content.category as string) || ''}
                onChange={(v) => handleContentChange('category', v)}
                placeholder="技能类别"
              />
            </h3>
            <p className="text-gray-700">
              <EditableText
                value={(content.skills as string[])?.join(', ') || ''}
                onChange={(v) => handleContentChange('skills', v.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="技能列表（用逗号分隔）"
              />
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
          <EditableText
            value={data.profile.name}
            onChange={(v) => updateProfile({ name: v })}
            placeholder="您的姓名"
          />
        </h1>
        <div className="text-gray-600 mt-2 flex items-center justify-center gap-2">
          <EditableText
            value={data.profile.email}
            onChange={(v) => updateProfile({ email: v })}
            placeholder="邮箱"
          />
          <span>|</span>
          <EditableText
            value={data.profile.phone}
            onChange={(v) => updateProfile({ phone: v })}
            placeholder="电话"
          />
        </div>
      </div>

      {/* 个人简介 */}
      <div
        className="mb-6 p-4 bg-gray-50 border-l-4"
        style={{ borderColor: primaryColor }}
      >
        <EditableText
          value={data.profile.summary}
          onChange={(v) => updateProfile({ summary: v })}
          placeholder="点击添加个人简介..."
          multiline
          className="text-gray-700"
        />
      </div>

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
