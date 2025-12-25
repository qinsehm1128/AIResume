import { useState, useMemo, useCallback } from 'react';
import type { ResumeData, LayoutConfig, SectionData, DraggedNode } from '../types';
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
  'elegant-gold': '#b8860b',
  'tech-green': '#059669',
};

const shadowStyles: Record<string, string> = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

const fontFamilies: Record<string, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: '"SF Mono", "Fira Code", "Fira Mono", Menlo, monospace',
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
      className={`cursor-text hover:bg-blue-50 hover:bg-opacity-50 rounded px-1 -mx-1 ${className}`}
      title="点击编辑"
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
    </span>
  );
}

// 可拖拽容器组件
function DraggableSection({
  children,
  section,
  onSectionClick,
  sectionStyle,
}: {
  children: React.ReactNode;
  section: SectionData;
  onSectionClick: (id: string) => void;
  sectionStyle: React.CSSProperties;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      setIsDragging(true);

      const dragData: DraggedNode = {
        id: section.id,
        path: `sections.${section.id}`,
        type: section.type,
        content: section.content?.title as string || section.content?.name as string || section.type,
      };

      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [section]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (
        (e.target as HTMLElement).tagName !== 'INPUT' &&
        (e.target as HTMLElement).tagName !== 'TEXTAREA'
      ) {
        onSectionClick(section.id);
      }
    },
    [section.id, onSectionClick]
  );

  return (
    <div
      style={{
        ...sectionStyle,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        position: 'relative',
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 拖拽提示 */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '0',
            fontSize: '11px',
            background: '#3b82f6',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 100,
            whiteSpace: 'nowrap',
          }}
        >
          拖拽到对话框修改此部分
        </div>
      )}
      {children}
    </div>
  );
}

export default function ResumePreview({ data, layout, onSectionClick }: Props) {
  const focusedSectionId = useResumeStore((state) => state.focusedSectionId);
  const updateProfile = useResumeStore((state) => state.updateProfile);
  const updateSection = useResumeStore((state) => state.updateSection);

  // 计算样式
  const styles = useMemo(() => {
    const primaryColor = layout.primary_color || themeColors[layout.theme] || '#2563eb';
    const sectionSpacing = layout.section_spacing || '24px';
    const lineHeight = layout.line_height || '1.6';
    const borderRadius = layout.border_radius || '8px';
    const backgroundColor = layout.background_color || '#ffffff';
    const headerBackground = layout.header_background || 'transparent';
    const shadow = shadowStyles[layout.shadow || 'lg'] || shadowStyles.lg;
    const fontFamily = fontFamilies[layout.font_family || 'system'] || fontFamilies.system;
    const headerFontSize = layout.header_font_size || '28px';
    const headerAlignment = layout.header_alignment || 'center';
    const sectionStyle = layout.section_style || 'card';
    const accentStyle = layout.accent_style || 'border-left';
    const borderStyle = layout.border_style || 'none';

    return {
      primaryColor,
      sectionSpacing,
      lineHeight,
      borderRadius,
      backgroundColor,
      headerBackground,
      shadow,
      fontFamily,
      headerFontSize,
      headerAlignment,
      sectionStyle,
      accentStyle,
      borderStyle,
    };
  }, [layout]);

  // 获取 section 样式
  const getSectionStyle = (isActive: boolean): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: '16px',
      borderRadius: styles.borderRadius,
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    };

    if (isActive) {
      baseStyle.boxShadow = '0 0 0 2px #3b82f6';
      baseStyle.backgroundColor = 'rgba(59, 130, 246, 0.05)';
    }

    switch (styles.sectionStyle) {
      case 'card':
        baseStyle.backgroundColor = isActive ? 'rgba(59, 130, 246, 0.05)' : '#ffffff';
        baseStyle.boxShadow = isActive
          ? '0 0 0 2px #3b82f6, 0 2px 4px rgba(0,0,0,0.1)'
          : '0 2px 4px rgba(0,0,0,0.1)';
        break;
      case 'bordered':
        baseStyle.border = `1px solid ${isActive ? '#3b82f6' : '#e5e7eb'}`;
        baseStyle.backgroundColor = isActive ? 'rgba(59, 130, 246, 0.05)' : 'transparent';
        break;
      case 'flat':
      default:
        baseStyle.backgroundColor = isActive ? 'rgba(59, 130, 246, 0.05)' : 'transparent';
        break;
    }

    return baseStyle;
  };

  // 获取强调样式
  const getAccentStyle = (): React.CSSProperties => {
    switch (styles.accentStyle) {
      case 'border-left':
        return { borderLeft: `4px solid ${styles.primaryColor}`, paddingLeft: '16px' };
      case 'underline':
        return { borderBottom: `2px solid ${styles.primaryColor}`, paddingBottom: '8px' };
      case 'background':
        return { backgroundColor: `${styles.primaryColor}15`, padding: '16px', borderRadius: styles.borderRadius };
      case 'none':
      default:
        return {};
    }
  };

  const renderSection = (section: SectionData) => {
    const isActive = focusedSectionId === section.id;
    const content = section.content || {};

    const handleContentChange = (field: string, value: string | string[]) => {
      updateSection(section.id, { [field]: value });
    };

    const sectionContainerStyle = getSectionStyle(isActive);

    const renderContent = () => {
      switch (section.type) {
        case 'experience':
          return (
            <>
              <h3 className="font-semibold" style={{ color: styles.primaryColor }}>
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
            </>
          );

        case 'education':
          return (
            <>
              <h3 className="font-semibold" style={{ color: styles.primaryColor }}>
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
            </>
          );

        case 'project':
          return (
            <>
              <h3 className="font-semibold" style={{ color: styles.primaryColor }}>
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
            </>
          );

        case 'skill':
          return (
            <>
              <h3 className="font-semibold" style={{ color: styles.primaryColor }}>
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
            </>
          );

        default:
          return null;
      }
    };

    return (
      <DraggableSection
        key={section.id}
        section={section}
        onSectionClick={onSectionClick}
        sectionStyle={sectionContainerStyle}
      >
        {renderContent()}
      </DraggableSection>
    );
  };

  // 容器样式
  const containerStyle: React.CSSProperties = {
    backgroundColor: styles.backgroundColor,
    boxShadow: styles.shadow,
    borderRadius: styles.borderRadius,
    padding: '32px',
    maxWidth: '42rem',
    margin: '0 auto',
    fontSize: layout.font_size || '14px',
    fontFamily: styles.fontFamily,
    lineHeight: styles.lineHeight,
    border: styles.borderStyle !== 'none' ? `1px ${styles.borderStyle} #e5e7eb` : 'none',
  };

  // 头部样式
  const headerStyle: React.CSSProperties = {
    textAlign: styles.headerAlignment as 'left' | 'center' | 'right',
    borderBottom: `2px solid ${styles.primaryColor}`,
    paddingBottom: '24px',
    marginBottom: '24px',
    backgroundColor: styles.headerBackground,
    borderRadius: styles.headerBackground !== 'transparent' ? styles.borderRadius : undefined,
    padding: styles.headerBackground !== 'transparent' ? '24px' : undefined,
  };

  // 个人简介样式
  const summaryStyle: React.CSSProperties = {
    marginBottom: '24px',
    padding: '16px',
    ...getAccentStyle(),
  };

  return (
    <div style={containerStyle}>
      {/* 头部信息 */}
      <div style={headerStyle}>
        <h1
          className="font-bold"
          style={{ color: styles.primaryColor, fontSize: styles.headerFontSize }}
        >
          <EditableText
            value={data.profile.name}
            onChange={(v) => updateProfile({ name: v })}
            placeholder="您的姓名"
          />
        </h1>
        <div
          className="text-gray-600 mt-2"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: styles.headerAlignment === 'center' ? 'center' : styles.headerAlignment === 'right' ? 'flex-end' : 'flex-start',
            gap: '8px',
          }}
        >
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
      <div style={summaryStyle}>
        <EditableText
          value={data.profile.summary}
          onChange={(v) => updateProfile({ summary: v })}
          placeholder="点击添加个人简介..."
          multiline
          className="text-gray-700"
        />
      </div>

      {/* 各个模块 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: styles.sectionSpacing }}>
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
