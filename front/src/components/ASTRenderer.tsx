import { useMemo, useState, useCallback } from 'react';
import type { ASTNode, ASTNodeStyle, ResumeData, DraggedNode } from '../types';

interface Props {
  node: ASTNode;
  data: ResumeData;
  onNodeDragStart?: (node: DraggedNode) => void;
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string;
  editable?: boolean;
}

// 将 snake_case 转换为 camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// 将 AST 样式转换为 React CSSProperties
function convertStyles(styles?: ASTNodeStyle): React.CSSProperties {
  if (!styles) return {};

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(styles)) {
    if (value !== undefined && value !== null) {
      result[toCamelCase(key)] = value;
    }
  }
  return result as React.CSSProperties;
}

// 解析变量引用 {{variable}}
function resolveContent(content: string | undefined, data: ResumeData): string {
  if (!content) return '';

  return content.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const value = getValueByPath(data, path.trim());
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value || '');
  });
}

// 根据路径获取数据
function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return '';
    if (typeof current !== 'object') return '';
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

// 渲染单个节点
function ASTNodeRenderer({
  node,
  data,
  onNodeDragStart,
  onNodeClick,
  selectedNodeId,
  editable = true,
  depth = 0,
}: Props & { depth?: number }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      setIsDragging(true);

      const dragData: DraggedNode = {
        id: node.id,
        path: node.data_path || '',
        type: node.type,
        content: node.content,
      };

      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'copy';

      if (onNodeDragStart) {
        onNodeDragStart(dragData);
      }
    },
    [node, onNodeDragStart]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [node.id, onNodeClick]
  );

  // 计算节点样式
  const nodeStyle = useMemo(() => {
    const baseStyle = convertStyles(node.styles);
    const isSelected = selectedNodeId === node.id;

    return {
      ...baseStyle,
      cursor: node.draggable !== false && editable ? 'grab' : 'default',
      outline: isSelected ? '2px solid #3b82f6' : isHovered && editable ? '1px dashed #93c5fd' : 'none',
      outlineOffset: '2px',
      opacity: isDragging ? 0.5 : 1,
      position: 'relative' as const,
    };
  }, [node.styles, node.draggable, selectedNodeId, node.id, isHovered, isDragging, editable]);

  // 解析内容
  const resolvedContent = useMemo(() => {
    return resolveContent(node.content, data);
  }, [node.content, data]);

  // 处理循环渲染
  if (node.repeat) {
    const repeatData = getValueByPath(data, node.repeat);
    if (Array.isArray(repeatData)) {
      return (
        <>
          {repeatData.map((item, index) => (
            <ASTNodeRenderer
              key={`${node.id}-${index}`}
              node={{
                ...node,
                id: `${node.id}-${index}`,
                repeat: undefined,
                content: node.content?.replace(
                  new RegExp(`\\{\\{${node.repeat}\\[\\]`, 'g'),
                  `{{${node.repeat}[${index}]`
                ),
              }}
              data={data}
              onNodeDragStart={onNodeDragStart}
              onNodeClick={onNodeClick}
              selectedNodeId={selectedNodeId}
              editable={editable}
              depth={depth}
            />
          ))}
        </>
      );
    }
  }

  // 渲染子节点
  const children = node.children?.map((child, index) => (
    <ASTNodeRenderer
      key={child.id || `${node.id}-child-${index}`}
      node={child}
      data={data}
      onNodeDragStart={onNodeDragStart}
      onNodeClick={onNodeClick}
      selectedNodeId={selectedNodeId}
      editable={editable}
      depth={depth + 1}
    />
  ));

  // 构建节点属性
  const nodeProps: React.HTMLAttributes<HTMLElement> = {
    style: nodeStyle,
    className: node.class_name || '',
    onClick: handleClick,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  if (node.draggable !== false && editable) {
    nodeProps.draggable = true;
    nodeProps.onDragStart = handleDragStart;
    nodeProps.onDragEnd = handleDragEnd;
  }

  // 添加拖拽提示
  const dragHint = isHovered && editable && node.draggable !== false && (
    <div
      style={{
        position: 'absolute',
        top: '-20px',
        left: '0',
        fontSize: '10px',
        background: '#3b82f6',
        color: 'white',
        padding: '2px 6px',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: 100,
        whiteSpace: 'nowrap',
      }}
    >
      拖拽到对话框修改此部分
    </div>
  );

  // 根据标签类型渲染
  const Tag = node.tag as keyof JSX.IntrinsicElements;

  return (
    <Tag {...nodeProps}>
      {dragHint}
      {resolvedContent}
      {children}
    </Tag>
  );
}

// 主渲染组件
export default function ASTRenderer({
  node,
  data,
  onNodeDragStart,
  onNodeClick,
  selectedNodeId,
  editable = true,
}: Props) {
  return (
    <ASTNodeRenderer
      node={node}
      data={data}
      onNodeDragStart={onNodeDragStart}
      onNodeClick={onNodeClick}
      selectedNodeId={selectedNodeId}
      editable={editable}
    />
  );
}
