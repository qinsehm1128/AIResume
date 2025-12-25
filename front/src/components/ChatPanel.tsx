import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../api/client';
import { useResumeStore } from '../store';
import type { ChatMessage } from '../types';

interface Props {
  resumeId: number;
}

export default function ChatPanel({ resumeId }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    focusedSectionId,
    addMessage,
    updateResumeData,
    updateLayoutConfig,
  } = useResumeStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    addMessage(userMessage);
    setInput('');
    setLoading(true);

    try {
      const response = await sendChatMessage(resumeId, input, focusedSectionId || undefined);

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

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-gray-800">AI 助手</h2>
        {focusedSectionId && (
          <p className="text-xs text-blue-600">当前选中：{focusedSectionId}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p className="mb-4">与 AI 对话来编辑你的简历</p>
            <div className="text-sm space-y-2">
              <p>"帮我写一段专业的个人简介"</p>
              <p>"润色我的工作经历描述"</p>
              <p>"把主题换成经典黑色"</p>
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

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
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
