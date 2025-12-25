import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listTemplates,
  createTemplate,
  deleteTemplate,
  generateTemplate,
} from '../api/client';
import type { Template, ResumeData } from '../types';
import ASTRenderer from '../components/ASTRenderer';

// 示例简历数据用于预览
const sampleResumeData: ResumeData = {
  profile: {
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '138-1234-5678',
    summary: '5年全栈开发经验，精通 React、Node.js、Python 等技术栈，具备良好的团队协作能力和项目管理经验。',
  },
  sections: [
    {
      id: 'exp-1',
      type: 'experience',
      content: {
        title: '高级前端工程师',
        company: '某科技公司',
        start_date: '2021-03',
        end_date: '至今',
        description: '负责公司核心产品的前端架构设计和开发，带领3人团队完成多个大型项目。',
      },
    },
    {
      id: 'edu-1',
      type: 'education',
      content: {
        degree: '计算机科学与技术学士',
        institution: '某大学',
        start_date: '2014-09',
        end_date: '2018-06',
      },
    },
    {
      id: 'skill-1',
      type: 'skill',
      content: {
        category: '编程语言',
        skills: ['JavaScript', 'TypeScript', 'Python', 'Go'],
      },
    },
  ],
};

export default function TemplateDesigner() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewMode, setPreviewMode] = useState<'list' | 'preview'>('list');
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await listTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    try {
      const template = await generateTemplate(prompt);
      setTemplates([template, ...templates]);
      setSelectedTemplate(template);
      setPreviewMode('preview');
      setPrompt('');
    } catch (error) {
      console.error('生成模板失败:', error);
      alert('生成模板失败，请检查 AI 配置');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateBlank = async () => {
    try {
      const template = await createTemplate({
        name: '新模板',
        description: '自定义模板',
      });
      setTemplates([template, ...templates]);
      setSelectedTemplate(template);
      setPreviewMode('preview');
    } catch (error) {
      console.error('创建模板失败:', error);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      await deleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
        setPreviewMode('list');
      }
    } catch (error) {
      console.error('删除模板失败:', error);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setPreviewMode('preview');
  };

  const renderTemplateCard = (template: Template) => (
    <div
      key={template.id}
      onClick={() => handleSelectTemplate(template)}
      className={`relative group cursor-pointer rounded-lg border-2 transition-all ${
        selectedTemplate?.id === template.id
          ? 'border-blue-500 shadow-lg'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      {/* 缩略图或预览 */}
      <div className="h-48 bg-gray-50 rounded-t-lg overflow-hidden p-4">
        {template.ast?.root ? (
          <div className="transform scale-[0.3] origin-top-left w-[333%] h-[333%]">
            <ASTRenderer
              node={template.ast.root}
              data={sampleResumeData}
              editable={false}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
        )}
      </div>

      {/* 模板信息 */}
      <div className="p-4 bg-white rounded-b-lg">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">{template.name}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {template.description || '暂无描述'}
            </p>
          </div>
          {template.is_system && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">系统</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          更新于：{new Date(template.updated_at).toLocaleDateString('zh-CN')}
        </p>
      </div>

      {/* 删除按钮 */}
      {!template.is_system && (
        <button
          onClick={(e) => handleDelete(template.id, e)}
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition bg-white rounded-full shadow"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800">模板设计器</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode('list')}
              className={`px-4 py-2 rounded-lg transition ${
                previewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              模板列表
            </button>
            {selectedTemplate && (
              <button
                onClick={() => setPreviewMode('preview')}
                className={`px-4 py-2 rounded-lg transition ${
                  previewMode === 'preview'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                预览
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* AI 生成区域 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">AI 生成模板</h2>
          <div className="flex gap-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述您想要的简历模板风格，例如：'现代简约风格，左侧侧边栏，蓝色主题，适合科技行业'"
              className="flex-1 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={generating}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    生成中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI 生成
                  </>
                )}
              </button>
              <button
                onClick={handleCreateBlank}
                disabled={generating}
                className="px-6 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed transition"
              >
                创建空白模板
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            提示：您可以描述布局结构、颜色主题、字体风格等，AI 将为您生成对应的模板。
          </p>
        </div>

        {/* 内容区域 */}
        {previewMode === 'list' ? (
          /* 模板列表 */
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              所有模板 ({templates.length})
            </h2>
            {loading ? (
              <div className="text-center py-12">
                <span className="text-gray-500">加载中...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <p className="text-gray-500">暂无模板</p>
                <p className="text-sm text-gray-400 mt-2">使用 AI 生成或创建空白模板开始</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(renderTemplateCard)}
              </div>
            )}
          </div>
        ) : (
          /* 模板预览 */
          selectedTemplate && (
            <div className="grid grid-cols-3 gap-6">
              {/* 左侧：模板信息 */}
              <div className="col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">模板信息</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">名称</label>
                      <p className="text-gray-800">{selectedTemplate.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">描述</label>
                      <p className="text-gray-800">{selectedTemplate.description || '暂无描述'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">创建时间</label>
                      <p className="text-gray-800">
                        {new Date(selectedTemplate.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">类型</label>
                      <p className="text-gray-800">
                        {selectedTemplate.is_system ? '系统模板' : '自定义模板'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-sm font-semibold text-gray-600 mb-3">操作</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          // TODO: 使用此模板创建新简历
                          alert('此功能将在后续实现');
                        }}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                      >
                        使用此模板
                      </button>
                      {!selectedTemplate.is_system && (
                        <button
                          onClick={(e) => handleDelete(selectedTemplate.id, e as unknown as React.MouseEvent)}
                          className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                        >
                          删除模板
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：模板预览 */}
              <div className="col-span-2">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">模板预览</h2>
                  <div className="border rounded-lg p-6 bg-gray-50 min-h-[600px]">
                    {selectedTemplate.ast?.root ? (
                      <ASTRenderer
                        node={selectedTemplate.ast.root}
                        data={sampleResumeData}
                        editable={false}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p>模板暂无 AST 结构</p>
                          <p className="text-sm mt-2">请使用 AI 重新生成或编辑模板</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
