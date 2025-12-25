import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLLMConfig, saveLLMConfig } from '../api/client';

export default function Settings() {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gpt-4o');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getLLMConfig();
      if (config) {
        setBaseUrl(config.base_url || '');
        setModelName(config.model_name);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await saveLLMConfig({
        base_url: baseUrl || undefined,
        api_key: apiKey || undefined,
        model_name: modelName,
      });
      setMessage('保存成功！');
      setApiKey('');
    } catch {
      setMessage('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">LLM 设置</h1>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            返回首页
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                API 地址（OpenAI 兼容）
              </label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
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
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sk-..."
              />
              <p className="text-sm text-gray-500 mt-1">
                输入新密钥以更新（留空保持现有密钥）
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2">模型名称</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="gpt-4o, deepseek-chat, claude-3-sonnet 等"
              />
              <p className="text-sm text-gray-500 mt-1">
                输入模型名称，如 gpt-4o、gpt-4o-mini、deepseek-chat、claude-3-sonnet 等
              </p>
            </div>

            {message && (
              <p
                className={`mb-4 ${
                  message.includes('成功') ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存设置'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
