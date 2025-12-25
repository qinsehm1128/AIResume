import { useState, useEffect } from 'react';
import { listVersions, restoreVersion } from '../api/client';
import type { ResumeVersion } from '../types';
import { useResumeStore } from '../store';

interface Props {
  resumeId: number;
}

export default function VersionHistory({ resumeId }: Props) {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const setCurrentResume = useResumeStore((state) => state.setCurrentResume);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await listVersions(resumeId);
      setVersions(data);
    } catch (error) {
      console.error('加载版本历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, resumeId]);

  const handleRestore = async (versionId: number) => {
    if (!confirm('确定要恢复到此版本吗？当前状态将保存为新版本。')) {
      return;
    }

    try {
      const resume = await restoreVersion(resumeId, versionId);
      setCurrentResume(resume);
      setOpen(false);
    } catch (error) {
      console.error('恢复版本失败:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        历史版本
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg z-10 border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800">版本历史</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-gray-500">加载中...</div>
            )}

            {!loading && versions.length === 0 && (
              <div className="p-4 text-center text-gray-500">暂无历史版本</div>
            )}

            {versions.map((version) => (
              <div
                key={version.id}
                className="p-4 border-b hover:bg-gray-50 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    版本 {version.version_number}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(version.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(version.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  恢复
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
