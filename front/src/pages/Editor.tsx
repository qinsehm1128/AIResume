import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResume, updateResume, uploadDocument, exportPDF } from '../api/client';
import { useResumeStore } from '../store';
import ResumePreview from '../components/ResumePreview';
import ASTRenderer from '../components/ASTRenderer';
import ChatPanel from '../components/ChatPanel';
import VersionHistory from '../components/VersionHistory';
import type { DraggedNode, ASTNode, ResumeData, SectionData } from '../types';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const resumeId = parseInt(id || '0');
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'template' | 'edit'>('template');

  const {
    currentResume,
    setCurrentResume,
    setFocusedSection,
    updateResumeData,
    setDraggedNode,
    focusedSectionId,
  } = useResumeStore();

  // 检查是否有模板 AST
  const hasTemplateAst = currentResume?.template_ast?.root != null;

  useEffect(() => {
    loadResume();
  }, [resumeId]);

  const loadResume = async () => {
    try {
      const resume = await getResume(resumeId);
      setCurrentResume(resume);
    } catch (error) {
      console.error('加载简历失败:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentResume) return;
    setSaving(true);
    try {
      await updateResume(resumeId, {
        resume_data: currentResume.resume_data,
        layout_config: currentResume.layout_config,
      });
    } catch (error) {
      console.error('保存简历失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const resumeData = await uploadDocument(file);
      updateResumeData(resumeData);
      // 解析后立即保存到数据库（首次导入不创建版本）
      await updateResume(resumeId, { resume_data: resumeData, create_version: false });
    } catch (error) {
      console.error('上传文档失败:', error);
      alert('解析文档失败，请重试');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportPDF(resumeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `简历-${resumeId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出 PDF 失败:', error);
      alert('导出 PDF 失败，请重试');
    }
  };

  // AST 转 HTML 的辅助函数
  const convertStylesToCSS = useCallback((styles?: Record<string, string>): string => {
    if (!styles) return '';
    return Object.entries(styles)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        // 将 snake_case 转换为 kebab-case
        const cssKey = key.replace(/_/g, '-');
        return `${cssKey}: ${value}`;
      })
      .join('; ');
  }, []);

  const getValueByPath = useCallback((obj: unknown, path: string): unknown => {
    if (!obj || !path) return '';
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return '';
      if (typeof current !== 'object') return '';
      const arrayIndex = parseInt(part, 10);
      if (!isNaN(arrayIndex) && Array.isArray(current)) {
        current = current[arrayIndex];
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }
    return current;
  }, []);

  const resolveContent = useCallback((
    content: string | undefined,
    data: ResumeData,
    repeatItem?: SectionData
  ): string => {
    if (!content) return '';
    return content.replace(/\{\{([^}]+)\}\}/g, (match, path: string) => {
      const trimmedPath = path.trim();
      if (repeatItem !== undefined) {
        if (trimmedPath.startsWith('item.')) {
          const itemPath = trimmedPath.slice(5);
          const value = getValueByPath(repeatItem, itemPath);
          if (Array.isArray(value)) return value.join(', ');
          return String(value || '');
        }
        if (trimmedPath.startsWith('content.')) {
          const contentPath = trimmedPath.slice(8);
          const value = getValueByPath(repeatItem.content, contentPath);
          if (Array.isArray(value)) return value.join(', ');
          return String(value || '');
        }
        const directValue = getValueByPath(repeatItem, trimmedPath);
        if (directValue !== '' && directValue !== undefined) {
          if (Array.isArray(directValue)) return directValue.join(', ');
          return String(directValue);
        }
      }
      const value = getValueByPath(data, trimmedPath);
      if (Array.isArray(value)) return value.join(', ');
      return String(value || '');
    });
  }, [getValueByPath]);

  // 类型映射
  const SECTION_TYPE_MAP: Record<string, string[]> = {
    skill: ['skill', 'skills', '技能', '专业技能'],
    education: ['education', 'educations', '教育', '教育背景', '学历'],
    experience: ['experience', 'experiences', '经验', '工作经验', '工作经历'],
    project: ['project', 'projects', '项目', '项目经历'],
  };

  const normalizeType = useCallback((typeName: string): string | null => {
    const lowerType = typeName.toLowerCase();
    for (const [standardType, variants] of Object.entries(SECTION_TYPE_MAP)) {
      if (variants.some(v => v.toLowerCase() === lowerType)) {
        return standardType;
      }
    }
    return null;
  }, []);

  const astToHtml = useCallback((
    node: ASTNode,
    data: ResumeData,
    repeatItem?: SectionData
  ): string => {
    // 处理循环渲染
    if (node.repeat) {
      let repeatData: SectionData[] = [];
      const sectionTypeMatch = node.repeat.match(/^sections\.(.+)$/);
      if (sectionTypeMatch) {
        const rawType = sectionTypeMatch[1];
        const normalizedType = normalizeType(rawType);
        const allSections = data.sections || [];
        if (normalizedType) {
          repeatData = allSections.filter((s) => s.type === normalizedType);
        } else {
          repeatData = allSections.filter((s) => s.type === rawType);
        }
      } else if (node.repeat === 'sections') {
        repeatData = data.sections || [];
      }

      if (repeatData.length > 0) {
        return repeatData.map((item) => {
          const nodeWithoutRepeat = { ...node, repeat: undefined };
          return astToHtml(nodeWithoutRepeat, data, item);
        }).join('\n');
      }
      return '';
    }

    // 自闭合标签
    const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    const tag = node.tag || 'div';
    const isVoidElement = VOID_ELEMENTS.has(tag.toLowerCase());

    // 构建属性
    const attrs: string[] = [];
    if (node.class_name) {
      attrs.push(`class="${node.class_name}"`);
    }
    const styleStr = convertStylesToCSS(node.styles);
    if (styleStr) {
      attrs.push(`style="${styleStr}"`);
    }
    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

    // 解析内容
    const content = resolveContent(node.content, data, repeatItem);

    // 渲染子节点
    const childrenHtml = node.children
      ? node.children.map(child => astToHtml(child, data, repeatItem)).join('\n')
      : '';

    if (isVoidElement) {
      return `<${tag}${attrStr} />`;
    }

    return `<${tag}${attrStr}>${content}${childrenHtml}</${tag}>`;
  }, [convertStylesToCSS, resolveContent, normalizeType]);

  const handleExportHTML = useCallback(() => {
    if (!currentResume?.template_ast?.root) {
      alert('没有可导出的模板');
      return;
    }

    const htmlContent = astToHtml(
      currentResume.template_ast.root,
      currentResume.resume_data
    );

    // 获取全局样式
    const globalStyles = currentResume.template_ast.global_styles || '';

    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentResume.resume_data.profile?.name || '简历'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    ${globalStyles}
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    // 下载文件
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `简历-${currentResume.resume_data.profile?.name || resumeId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentResume, astToHtml, resumeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!currentResume) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-red-500">简历不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-800">{currentResume.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <VersionHistory resumeId={resumeId} />

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
            >
              {uploading ? (
                '上传中...'
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  上传文档
                </>
              )}
            </button>

            <button
              onClick={handleExport}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              导出 PDF
            </button>

            {hasTemplateAst && (
              <button
                onClick={handleExportHTML}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                导出 HTML
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧: 简历预览 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 视图模式切换 */}
          {hasTemplateAst && (
            <div className="max-w-3xl mx-auto mb-4 flex justify-center gap-2">
              <button
                onClick={() => setViewMode('template')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'template'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                模板预览
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'edit'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                内容编辑
              </button>
            </div>
          )}

          {hasTemplateAst && viewMode === 'template' && currentResume.template_ast ? (
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
              <ASTRenderer
                node={currentResume.template_ast.root}
                data={currentResume.resume_data}
                onNodeDragStart={(node: DraggedNode) => setDraggedNode(node)}
                onNodeClick={(nodeId: string) => setFocusedSection(nodeId)}
                selectedNodeId={focusedSectionId || undefined}
                editable={true}
              />
            </div>
          ) : (
            <ResumePreview
              data={currentResume.resume_data}
              layout={currentResume.layout_config}
              onSectionClick={setFocusedSection}
            />
          )}
        </div>

        {/* 右侧: AI 对话面板 */}
        <div className="w-96 border-l bg-gray-50 flex flex-col">
          <ChatPanel resumeId={resumeId} />
        </div>
      </div>
    </div>
  );
}
