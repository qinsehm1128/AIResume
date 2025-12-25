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
      console.error('Failed to load versions:', error);
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
    if (!confirm('Restore this version? Current state will be saved as a new version.')) {
      return;
    }

    try {
      const resume = await restoreVersion(resumeId, versionId);
      setCurrentResume(resume);
      setOpen(false);
    } catch (error) {
      console.error('Failed to restore version:', error);
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
        History
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg z-10 border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800">Version History</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            )}

            {!loading && versions.length === 0 && (
              <div className="p-4 text-center text-gray-500">No versions yet</div>
            )}

            {versions.map((version) => (
              <div
                key={version.id}
                className="p-4 border-b hover:bg-gray-50 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    Version {version.version_number}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(version.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(version.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
