import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listResumes, createResume, deleteResume, listTemplates } from '../api/client';
import type { Resume, Template } from '../types';
import { useAuthStore } from '../store';

export default function Home() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'template' | 'generate' | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    loadResumes();
    loadTemplates();
  }, []);

  const loadResumes = async () => {
    try {
      const data = await listResumes();
      setResumes(data);
    } catch (error) {
      console.error('加载简历失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await listTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('加载模板失败:', error);
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setCreateMode(null);
    setSelectedTemplateId(null);
    setGeneratePrompt('');
  };

  const handleCreate = async () => {
    if (createMode === 'template' && !selectedTemplateId) {
      alert('请选择一个模板');
      return;
    }
    if (createMode === 'generate' && !generatePrompt.trim()) {
      alert('请输入模板描述');
      return;
    }

    setCreating(true);
    try {
      const resume = await createResume({
        template_id: createMode === 'template' ? selectedTemplateId ?? undefined : undefined,
        generate_template_prompt: createMode === 'generate' ? generatePrompt : undefined,
      });
      setShowCreateModal(false);
      navigate(`/editor/${resume.id}`);
    } catch (error) {
      console.error('创建简历失败:', error);
      alert('创建简历失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateBlank = async () => {
    setCreating(true);
    try {
      const resume = await createResume();
      setShowCreateModal(false);
      navigate(`/editor/${resume.id}`);
    } catch (error) {
      console.error('创建简历失败:', error);
      alert('创建简历失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这份简历吗？')) return;

    try {
      await deleteResume(id);
      setResumes(resumes.filter((r) => r.id !== id));
    } catch (error) {
      console.error('删除简历失败:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">我的简历</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/templates')}
              className="px-4 py-2 text-blue-600 hover:text-blue-800"
            >
              模板设计器
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              设置
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-red-600 hover:text-red-800"
            >
              退出登录
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={handleOpenCreateModal}
            className="h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition"
          >
            <svg
              className="w-12 h-12 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>创建新简历</span>
          </button>

          {loading && (
            <div className="h-48 flex items-center justify-center">
              <span className="text-gray-500">加载中...</span>
            </div>
          )}

          {resumes.map((resume) => (
            <div
              key={resume.id}
              onClick={() => navigate(`/editor/${resume.id}`)}
              className="h-48 bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition relative group"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {resume.title}
              </h3>
              <p className="text-sm text-gray-500">
                {resume.resume_data.profile?.name || '未填写姓名'}
              </p>
              <p className="text-xs text-gray-400 mt-4">
                更新于：{new Date(resume.updated_at).toLocaleDateString('zh-CN')}
              </p>
              <button
                onClick={(e) => handleDelete(resume.id, e)}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 创建简历弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">创建新简历</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {!createMode ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 空白简历 */}
                  <button
                    onClick={handleCreateBlank}
                    disabled={creating}
                    className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition flex flex-col items-center justify-center gap-3"
                  >
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium text-gray-700">空白简历</span>
                    <span className="text-xs text-gray-500">从零开始创建</span>
                  </button>

                  {/* 选择模板 */}
                  <button
                    onClick={() => setCreateMode('template')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition flex flex-col items-center justify-center gap-3"
                  >
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    <span className="font-medium text-gray-700">选择模板</span>
                    <span className="text-xs text-gray-500">使用现有模板</span>
                  </button>

                  {/* AI 生成 */}
                  <button
                    onClick={() => setCreateMode('generate')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition flex flex-col items-center justify-center gap-3"
                  >
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="font-medium text-gray-700">AI 生成模板</span>
                    <span className="text-xs text-gray-500">描述你想要的风格</span>
                  </button>
                </div>
              ) : createMode === 'template' ? (
                <div>
                  <button
                    onClick={() => setCreateMode(null)}
                    className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    返回
                  </button>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">选择模板</h3>
                  {templates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      暂无可用模板，请先在模板设计器中创建模板
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={`p-4 border-2 rounded-lg transition text-left ${
                            selectedTemplateId === template.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="h-24 bg-gray-100 rounded mb-3 flex items-center justify-center">
                            {template.thumbnail ? (
                              <img
                                src={template.thumbnail}
                                alt={template.name}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                              </svg>
                            )}
                          </div>
                          <div className="font-medium text-gray-800 truncate">{template.name}</div>
                          <div className="text-xs text-gray-500 truncate">{template.description || '无描述'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!selectedTemplateId || creating}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? '创建中...' : '使用此模板'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setCreateMode(null)}
                    className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    返回
                  </button>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">AI 生成模板</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    描述你想要的简历模板风格，AI 将为你生成专属模板。
                  </p>
                  <textarea
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="例如：现代简约风格，左侧边栏显示联系方式，主区域显示工作经验和教育背景，使用蓝色作为主色调..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!generatePrompt.trim() || creating}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {creating ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          生成中...
                        </>
                      ) : (
                        '生成模板'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
