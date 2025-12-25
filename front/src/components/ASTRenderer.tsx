import { useMemo, useState, useCallback } from 'react';
import type { ASTNode, ASTNodeStyle, ResumeData, DraggedNode, SectionData } from '../types';

interface Props {
  node: ASTNode;
  data: ResumeData;
  repeatItem?: SectionData;  // 当前循环的 section 项
  repeatIndex?: number;      // 当前循环索引
  onNodeDragStart?: (node: DraggedNode) => void;
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string;
  editable?: boolean;
}

// 类型映射：支持各种命名变体
const SECTION_TYPE_MAP: Record<string, string[]> = {
  skill: ['skill', 'skills', '技能', '专业技能'],
  education: ['education', 'educations', '教育', '教育背景', '学历'],
  experience: ['experience', 'experiences', '经验', '工作经验', '工作经历'],
  project: ['project', 'projects', '项目', '项目经历'],
};

// 根据类型名称获取标准类型
function normalizeType(typeName: string): string | null {
  const lowerType = typeName.toLowerCase();
  for (const [standardType, variants] of Object.entries(SECTION_TYPE_MAP)) {
    if (variants.some(v => v.toLowerCase() === lowerType)) {
      return standardType;
    }
  }
  return null;
}

// HTML 自闭合标签（void elements）
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

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

// 根据路径获取数据（支持数组索引）
function getValueByPath(obj: unknown, path: string): unknown {
  if (!obj || !path) return '';

  // 处理数组索引，如 sections[0].content.title
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return '';
    if (typeof current !== 'object') return '';

    // 检查是否是数组索引
    const arrayIndex = parseInt(part, 10);
    if (!isNaN(arrayIndex) && Array.isArray(current)) {
      current = current[arrayIndex];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

// 解析变量引用 {{variable}}，支持 section 上下文
function resolveContent(
  content: string | undefined,
  data: ResumeData,
  repeatItem?: SectionData,
  repeatIndex?: number
): string {
  if (!content) return '';

  return content.replace(/\{\{([^}]+)\}\}/g, (match, path: string) => {
    const trimmedPath = path.trim();

    // 处理 section 相关的路径（当在 repeat 上下文中）
    if (repeatItem !== undefined) {
      // 支持 item.xxx 语法（当前循环项）
      if (trimmedPath.startsWith('item.')) {
        const itemPath = trimmedPath.slice(5);
        const value = getValueByPath(repeatItem, itemPath);
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value || '');
      }

      // 支持 section.xxx 语法
      if (trimmedPath.startsWith('section.')) {
        const sectionPath = trimmedPath.slice(8);
        const value = getValueByPath(repeatItem, sectionPath);
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value || '');
      }

      // 支持 sections[].xxx 或 sections[index].xxx 语法
      const sectionMatch = trimmedPath.match(/^sections\[\d*\]\.(.+)$/);
      if (sectionMatch) {
        const fieldPath = sectionMatch[1];
        const value = getValueByPath(repeatItem, fieldPath);
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value || '');
      }

      // 支持直接访问 content.xxx
      if (trimmedPath.startsWith('content.')) {
        const contentPath = trimmedPath.slice(8);
        const value = getValueByPath(repeatItem.content, contentPath);
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value || '');
      }

      // 支持 type, id 等直接属性
      if (['type', 'id'].includes(trimmedPath)) {
        return String((repeatItem as unknown as Record<string, unknown>)[trimmedPath] || '');
      }

      // 尝试直接从 repeatItem 获取
      const directValue = getValueByPath(repeatItem, trimmedPath);
      if (directValue !== '' && directValue !== undefined) {
        if (Array.isArray(directValue)) {
          return directValue.join(', ');
        }
        return String(directValue);
      }
    }

    // 普通路径解析
    const value = getValueByPath(data, trimmedPath);
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value || '');
  });
}

// 递归更新节点及其子节点的内容路径
function updateNodePaths(node: ASTNode, repeatPath: string, index: number): ASTNode {
  const updatedNode = { ...node };

  // 更新当前节点的 content
  if (updatedNode.content) {
    updatedNode.content = updatedNode.content
      .replace(new RegExp(`\\{\\{${repeatPath}\\[\\]`, 'g'), `{{${repeatPath}[${index}]`)
      .replace(new RegExp(`\\{\\{${repeatPath}\\[\\d*\\]`, 'g'), `{{${repeatPath}[${index}]`);
  }

  // 更新 data_path
  if (updatedNode.data_path?.startsWith(`${repeatPath}[`)) {
    updatedNode.data_path = updatedNode.data_path.replace(
      new RegExp(`^${repeatPath}\\[\\d*\\]`),
      `${repeatPath}[${index}]`
    );
  }

  // 递归更新子节点
  if (updatedNode.children) {
    updatedNode.children = updatedNode.children.map((child) =>
      updateNodePaths(child, repeatPath, index)
    );
  }

  return updatedNode;
}

// 渲染单个节点
function ASTNodeRenderer({
  node,
  data,
  repeatItem,
  repeatIndex,
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
    return resolveContent(node.content, data, repeatItem, repeatIndex);
  }, [node.content, data, repeatItem, repeatIndex]);

  // 处理循环渲染
  if (node.repeat) {
    let repeatData: unknown[] = [];

    // 检查是否是类型过滤的 repeat，如 "sections.skill", "sections.education", "sections.专业技能"
    const sectionTypeMatch = node.repeat.match(/^sections\.(.+)$/);
    if (sectionTypeMatch) {
      const rawType = sectionTypeMatch[1];
      const normalizedType = normalizeType(rawType);
      const allSections = data.sections || [];

      if (normalizedType) {
        // 使用标准化的类型进行匹配
        repeatData = allSections.filter((s) => s.type === normalizedType);
      } else {
        // 直接匹配原始类型
        repeatData = allSections.filter((s) => s.type === rawType);
      }
    } else if (node.repeat === 'sections') {
      // 直接使用所有 sections
      repeatData = data.sections || [];
    } else {
      repeatData = (getValueByPath(data, node.repeat) as unknown[]) || [];
    }

    // 如果有数据则渲染循环
    if (Array.isArray(repeatData) && repeatData.length > 0) {
      return (
        <>
          {repeatData.map((item, index) => {
            // 更新节点及其所有子节点的路径
            const updatedNode = updateNodePaths(
              { ...node, id: `${node.id}-${index}`, repeat: undefined },
              node.repeat!,
              index
            );

            return (
              <ASTNodeRenderer
                key={`${node.id}-${index}`}
                node={updatedNode}
                data={data}
                repeatItem={item as SectionData}
                repeatIndex={index}
                onNodeDragStart={onNodeDragStart}
                onNodeClick={onNodeClick}
                selectedNodeId={selectedNodeId}
                editable={editable}
                depth={depth}
              />
            );
          })}
        </>
      );
    }
  }

  // 渲染子节点（传递 repeatItem 上下文）
  const children = node.children?.map((child, index) => (
    <ASTNodeRenderer
      key={child.id || `${node.id}-child-${index}`}
      node={child}
      data={data}
      repeatItem={repeatItem}
      repeatIndex={repeatIndex}
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

  // 内联元素列表（不能包含 div 子元素）
  const INLINE_ELEMENTS = new Set(['p', 'span', 'a', 'strong', 'em', 'b', 'i', 'label']);
  const isInlineElement = INLINE_ELEMENTS.has(node.tag.toLowerCase());

  // 添加拖拽提示（对于内联元素使用 span，否则使用 div）
  const HintTag = isInlineElement ? 'span' : 'div';
  const dragHint = isHovered && editable && node.draggable !== false && !isInlineElement && (
    <HintTag
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
    </HintTag>
  );

  // 根据标签类型渲染
  const Tag = node.tag as keyof JSX.IntrinsicElements;
  const isVoidElement = VOID_ELEMENTS.has(node.tag.toLowerCase());

  // 自闭合标签不能有子元素
  if (isVoidElement) {
    // 对于 img 标签，需要设置 src 和 alt 属性
    const voidProps: Record<string, unknown> = { ...nodeProps };
    if (node.tag.toLowerCase() === 'img') {
      const imgSrc = resolvedContent || node.styles?.background;
      // 如果没有有效的 src，不渲染 img 标签
      if (!imgSrc) {
        return null;
      }
      voidProps.src = imgSrc;
      voidProps.alt = '';
    }
    return (
      <>
        {dragHint}
        <Tag {...voidProps} />
      </>
    );
  }

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
}: Omit<Props, 'repeatItem' | 'repeatIndex'>) {
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
