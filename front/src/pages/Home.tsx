import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listResumes, createResume, deleteResume } from '../api/client';
import type { Resume } from '../types';
import { useAuthStore } from '../store';

export default function Home() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    loadResumes();
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

  const handleCreate = async () => {
    try {
      const resume = await createResume();
      navigate(`/editor/${resume.id}`);
    } catch (error) {
      console.error('创建简历失败:', error);
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
            onClick={handleCreate}
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
    </div>
  );
}
