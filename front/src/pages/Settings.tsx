import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listLLMConfigs,
  createLLMConfig,
  updateLLMConfig,
  deleteLLMConfig,
  activateLLMConfig,
} from '../api/client';
import type { LLMConfig } from '../types';

interface ConfigFormData {
  name: string;
  base_url: string;
  api_key: string;
  model_name: string;
  available_models: string;
}

const defaultFormData: ConfigFormData = {
  name: '',
  base_url: '',
  api_key: '',
  model_name: 'gpt-4o',
  available_models: '',
};

export default function Settings() {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>(defaultFormData);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const data = await listLLMConfigs();
      setConfigs(data);
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: LLMConfig) => {
    setEditingId(config.id);
    setFormData({
      name: config.name,
      base_url: config.base_url || '',
      api_key: '',
      model_name: config.model_name,
      available_models: config.available_models.join(', '),
    });
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const models = formData.available_models
        .split(',')
        .map(m => m.trim())
        .filter(Boolean);

      if (editingId) {
        await updateLLMConfig(editingId, {
          name: formData.name,
          base_url: formData.base_url || undefined,
          api_key: formData.api_key || undefined,
          model_name: formData.model_name,
          available_models: models,
        });
        setMessage('配置已更新！');
      } else {
        await createLLMConfig({
          name: formData.name || '新配置',
          base_url: formData.base_url || undefined,
          api_key: formData.api_key || undefined,
          model_name: formData.model_name,
          available_models: models,
          is_active: configs.length === 0,
        });
        setMessage('配置已创建！');
      }

      await loadConfigs();
      handleCancel();
    } catch {
      setMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个配置吗？')) return;

    try {
      await deleteLLMConfig(id);
      await loadConfigs();
      setMessage('配置已删除');
    } catch {
      setMessage('删除失败');
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await activateLLMConfig(id);
      await loadConfigs();
      setMessage('已切换到该配置');
    } catch {
      setMessage('切换失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">API 配置管理</h1>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            返回首页
          </button>
        </div>

        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.includes('失败') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {message}
          </div>
        )}

        {/* 配置列表 */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">已配置的 API</h2>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              添加配置
            </button>
          </div>

          {configs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>还没有配置任何 API</p>
              <p className="text-sm mt-2">点击"添加配置"开始</p>
            </div>
          ) : (
            <div className="divide-y">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`p-4 flex items-center justify-between ${
                    config.is_active ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{config.name}</h3>
                      {config.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded">
                          当前使用
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      模型: {config.model_name}
                      {config.base_url && ` | API: ${config.base_url}`}
                    </p>
                    {config.available_models.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        可用模型: {config.available_models.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!config.is_active && (
                      <button
                        onClick={() => handleActivate(config.id)}
                        className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                      >
                        使用
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(config)}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 添加/编辑表单 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? '编辑配置' : '添加新配置'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">配置名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：OpenAI、DeepSeek、Claude 等"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">
                  API 地址（OpenAI 兼容）
                </label>
                <input
                  type="url"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.openai.com/v1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  留空则使用默认 OpenAI API 地址
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">API 密钥</label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="sk-..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  {editingId ? '留空保持现有密钥' : '输入 API 密钥'}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">默认模型名称</label>
                <input
                  type="text"
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="gpt-4o"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 mb-2">可用模型列表（可选）</label>
                <input
                  type="text"
                  value={formData.available_models}
                  onChange={(e) => setFormData({ ...formData, available_models: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="gpt-4o, gpt-4o-mini, gpt-3.5-turbo"
                />
                <p className="text-sm text-gray-500 mt-1">
                  用逗号分隔多个模型名称，用于在聊天时快速切换
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 使用说明 */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">使用说明</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>1. 可以配置多个不同的 API，如 OpenAI、DeepSeek、Claude 等</p>
            <p>2. 每个 API 可以设置多个可用模型，方便在聊天时切换</p>
            <p>3. 点击"使用"按钮可以切换当前使用的 API 配置</p>
            <p>4. 在聊天界面可以快速切换当前配置下的不同模型</p>
          </div>
        </div>
      </div>
    </div>
  );
}
