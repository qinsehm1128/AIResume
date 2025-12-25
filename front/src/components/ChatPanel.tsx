import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessageWithContext, uploadImage, type ImageData } from '../api/client';
import { useResumeStore } from '../store';
import type { ChatMessage, DraggedNode } from '../types';

interface Props {
  resumeId: number;
}

interface PendingImage {
  file: File;
  preview: string;
  base64?: string;
  mime_type?: string;
}

export default function ChatPanel({ resumeId }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    focusedSectionId,
    draggedNode,
    editMode,
    addMessage,
    updateResumeData,
    updateLayoutConfig,
    updateTemplateAst,
    setDraggedNode,
    setEditMode,
  } = useResumeStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      // 检查是否是节点拖拽
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        try {
          const node: DraggedNode = JSON.parse(jsonData);
          setDraggedNode(node);
          return;
        } catch {
          // 不是 JSON，继续检查是否是图片
        }
      }

      // 检查是否是图片文件拖放
      const files = Array.from(e.dataTransfer.files).filter(file =>
        file.type.startsWith('image/')
      );
      if (files.length > 0) {
        handleImageFiles(files);
      }
    },
    [setDraggedNode]
  );

  const handleImageFiles = async (files: File[]) => {
    setUploadingImage(true);
    try {
      for (const file of files) {
        const preview = URL.createObjectURL(file);
        const result = await uploadImage(file);

        setPendingImages(prev => [...prev, {
          file,
          preview,
          base64: result.base64,
          mime_type: result.mime_type,
        }]);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('图片上传失败，请重试');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageFiles(Array.from(files));
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setPendingImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleClearDraggedNode = useCallback(() => {
    setDraggedNode(null);
  }, [setDraggedNode]);

  const handleSend = async () => {
    if ((!input.trim() && pendingImages.length === 0) || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input + (pendingImages.length > 0 ? ` [附带${pendingImages.length}张图片]` : ''),
    };
    addMessage(userMessage);

    // Store the context before clearing
    const currentDraggedNode = draggedNode;
    const currentFocusedSectionId = focusedSectionId;
    const currentEditMode = editMode;
    const currentImages: ImageData[] = pendingImages
      .filter(img => img.base64 && img.mime_type)
      .map(img => ({
        base64: img.base64!,
        mime_type: img.mime_type!,
      }));

    setInput('');
    setDraggedNode(null);
    setPendingImages([]);
    setLoading(true);

    try {
      const response = await sendChatMessageWithContext(resumeId, input, {
        focusedSectionId: currentFocusedSectionId || undefined,
        draggedNode: currentDraggedNode || undefined,
        editMode: currentEditMode,
        images: currentImages.length > 0 ? currentImages : undefined,
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
      };
      addMessage(assistantMessage);

      if (response.resume_data) {
        updateResumeData(response.resume_data);
      }
      if (response.layout_config) {
        updateLayoutConfig(response.layout_config);
      }
      if (response.template_ast) {
        updateTemplateAst(response.template_ast);
      }
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: '抱歉，发生了错误，请重试。',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getNodeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      root: '根节点',
      header: '头部',
      section: '模块',
      text: '文本',
      list: '列表',
      grid: '网格',
      container: '容器',
      divider: '分隔线',
      icon: '图标',
    };
    return labels[type] || type;
  };

  const getEditModeLabel = (mode: 'content' | 'layout' | 'template') => {
    const labels: Record<string, string> = {
      content: '内容编辑',
      layout: '布局调整',
      template: '模板修改',
    };
    return labels[mode];
  };

  return (
    <div
      ref={dropZoneRef}
      className={`flex flex-col h-full bg-white rounded-lg shadow-md transition-all ${
        isDragOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 头部 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-800">AI 助手</h2>
          <div className="flex text-xs">
            {(['content', 'layout', 'template'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setEditMode(mode)}
                className={`px-2 py-1 rounded transition ${
                  editMode === mode
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getEditModeLabel(mode)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {focusedSectionId && (
            <p className="text-xs text-blue-600">
              选中模块：{focusedSectionId}
            </p>
          )}
        </div>
      </div>

      {/* 拖拽提示区域 */}
      {isDragOver && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="text-center text-blue-600">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="font-medium">拖放节点或图片到这里</p>
            <p className="text-sm">可以拖放简历节点或参考图片</p>
          </div>
        </div>
      )}

      {/* 已拖拽节点显示 */}
      {draggedNode && !isDragOver && (
        <div className="p-3 bg-purple-50 border-b border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-purple-800">
                  修改目标：{getNodeTypeLabel(draggedNode.type)}
                </p>
                {draggedNode.path && (
                  <p className="text-xs text-purple-600">
                    数据路径：{draggedNode.path}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleClearDraggedNode}
              className="p-1 text-purple-400 hover:text-purple-600 transition"
              title="清除选择"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p className="mb-4">与 AI 对话来编辑你的简历</p>
            <div className="text-sm space-y-2">
              <p>"帮我写一段专业的个人简介"</p>
              <p>"润色我的工作经历描述"</p>
              <p>"把主题换成经典黑色"</p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400 mb-2">提示：可以上传图片作为参考</p>
              <p className="text-xs text-gray-400">或拖拽简历节点指定修改目标</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 待发送图片预览 */}
      {pendingImages.length > 0 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pendingImages.map((img, index) => (
              <div key={index} className="relative flex-shrink-0">
                <img
                  src={img.preview}
                  alt={`待发送图片 ${index + 1}`}
                  className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            {uploadingImage && (
              <div className="h-16 w-16 flex-shrink-0 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          {/* 图片上传按钮 */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={loading || uploadingImage}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
            title="上传图片"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pendingImages.length > 0
                ? '描述您想让 AI 参考图片做什么...'
                : draggedNode
                  ? `描述您想对 "${getNodeTypeLabel(draggedNode.type)}" 做的修改...`
                  : '输入消息...'
            }
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && pendingImages.length === 0)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
