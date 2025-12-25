import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessageWithContext } from '../api/client';
import { useResumeStore } from '../store';
import type { ChatMessage, DraggedNode } from '../types';

interface Props {
  resumeId: number;
}

export default function ChatPanel({ resumeId }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    focusedSectionId,
    draggedNode,
    editMode,
    addMessage,
    updateResumeData,
    updateLayoutConfig,
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
    // Check if we're leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      try {
        const data = e.dataTransfer.getData('application/json');
        if (data) {
          const node: DraggedNode = JSON.parse(data);
          setDraggedNode(node);
        }
      } catch (error) {
        console.error('Failed to parse dropped node:', error);
      }
    },
    [setDraggedNode]
  );

  const handleClearDraggedNode = useCallback(() => {
    setDraggedNode(null);
  }, [setDraggedNode]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    addMessage(userMessage);

    // Store the context before clearing
    const currentDraggedNode = draggedNode;
    const currentFocusedSectionId = focusedSectionId;
    const currentEditMode = editMode;

    setInput('');
    setDraggedNode(null); // Clear after sending
    setLoading(true);

    try {
      const response = await sendChatMessageWithContext(resumeId, input, {
        focusedSectionId: currentFocusedSectionId || undefined,
        draggedNode: currentDraggedNode || undefined,
        editMode: currentEditMode,
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
          {/* 编辑模式切换 */}
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

        {/* 当前上下文提示 */}
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
            <p className="font-medium">拖放节点到这里</p>
            <p className="text-sm">告诉 AI 您想修改哪个部分</p>
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
                {draggedNode.content && (
                  <p className="text-xs text-purple-600 truncate max-w-[200px]">
                    内容：{draggedNode.content}
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
              <p className="text-xs text-gray-400 mb-2">提示：从简历预览中拖拽节点到这里</p>
              <p className="text-xs text-gray-400">可以精确指定 AI 修改的目标</p>
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

      {/* 输入区域 */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              draggedNode
                ? `描述您想对 "${getNodeTypeLabel(draggedNode.type)}" 做的修改...`
                : '输入消息...'
            }
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
