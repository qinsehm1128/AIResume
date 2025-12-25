import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResume, updateResume, uploadDocument, exportPDF } from '../api/client';
import { useResumeStore } from '../store';
import ResumePreview from '../components/ResumePreview';
import ASTRenderer from '../components/ASTRenderer';
import ChatPanel from '../components/ChatPanel';
import VersionHistory from '../components/VersionHistory';
import type { DraggedNode } from '../types';

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
