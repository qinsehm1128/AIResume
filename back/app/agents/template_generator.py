"""
AI Template Generator - 使用 AI 生成和解析简历模板 AST
"""
import json
import re
import uuid
from typing import Optional
from app.services.llm import get_llm_client
from langchain_core.messages import HumanMessage, SystemMessage


def extract_json_from_response(content: str) -> str:
    """从 AI 响应中提取 JSON，处理 markdown 代码块"""
    content = content.strip()

    # 移除 markdown 代码块标记
    if content.startswith("```"):
        # 移除开头的 ```json 或 ```
        content = re.sub(r'^```(?:json)?\s*\n?', '', content)
    if content.endswith("```"):
        content = content[:-3]

    content = content.strip()

    # 尝试找到 JSON 对象的开始和结束
    start_idx = content.find('{')
    if start_idx == -1:
        return content

    # 从第一个 { 开始
    content = content[start_idx:]

    return content


def try_fix_truncated_json(content: str) -> Optional[dict]:
    """尝试修复被截断的 JSON"""
    # 统计未闭合的括号
    open_braces = content.count('{') - content.count('}')
    open_brackets = content.count('[') - content.count(']')

    # 如果括号差距太大，可能是严重截断
    if open_braces > 20 or open_brackets > 20:
        return None

    # 检查是否在字符串中间截断（查找未闭合的引号）
    in_string = False
    escape_next = False
    last_char = ''

    for char in content:
        if escape_next:
            escape_next = False
            continue
        if char == '\\':
            escape_next = True
            continue
        if char == '"' and not escape_next:
            in_string = not in_string
        last_char = char

    # 如果在字符串中间截断，尝试闭合
    fixed = content
    if in_string:
        fixed += '"'

    # 闭合括号
    fixed += ']' * open_brackets
    fixed += '}' * open_braces

    try:
        return json.loads(fixed)
    except json.JSONDecodeError:
        return None


# 使用 Template 字符串避免 format 冲突，或者手动转义
GENERATE_TEMPLATE_PROMPT = """You are a professional resume template designer. Generate a beautiful resume template AST (Abstract Syntax Tree) based on the user's request.

## AST Structure:

```json
{{
  "version": "1.0",
  "root": {{
    "id": "unique-id",
    "type": "root|header|section|text|list|grid|container|divider",
    "tag": "div|header|section|h1|h2|p|span|ul|li",
    "class_name": "optional-class",
    "styles": {{
      "display": "flex|block|grid",
      "flex_direction": "row|column",
      "justify_content": "center|flex-start|flex-end|space-between",
      "align_items": "center|flex-start|flex-end",
      "gap": "16px",
      "padding": "24px",
      "margin": "0",
      "background": "#ffffff",
      "border": "1px solid #e5e7eb",
      "border_radius": "8px",
      "box_shadow": "0 4px 6px rgba(0,0,0,0.1)",
      "font_size": "16px",
      "font_weight": "normal|bold",
      "color": "#1f2937",
      "text_align": "left|center|right",
      "line_height": "1.6"
    }},
    "content": "文本内容或变量引用 {{{{profile.name}}}}",
    "data_path": "profile.name",
    "children": [],
    "editable": true,
    "draggable": true,
    "repeat": "sections"
  }},
  "variables": {{
    "profile.name": "姓名",
    "profile.email": "邮箱",
    "profile.phone": "电话",
    "profile.summary": "个人简介"
  }},
  "global_styles": "/* 全局 CSS */"
}}
```

## Available Data Paths:

### Profile Data:
- {{{{profile.name}}}} - 姓名
- {{{{profile.email}}}} - 邮箱
- {{{{profile.phone}}}} - 电话
- {{{{profile.summary}}}} - 个人简介

### Sections (按类型分组循环):
使用 repeat 属性按类型循环不同的 section。推荐为每种类型创建独立的区块：

**工作经验区块** - 使用 repeat="sections.experience":
- {{{{item.content.title}}}} - 职位名称
- {{{{item.content.company}}}} - 公司名称
- {{{{item.content.start_date}}}} - 开始时间
- {{{{item.content.end_date}}}} - 结束时间
- {{{{item.content.description}}}} - 工作描述

**教育背景区块** - 使用 repeat="sections.education":
- {{{{item.content.institution}}}} - 学校名称
- {{{{item.content.degree}}}} - 学位
- {{{{item.content.field}}}} - 专业
- {{{{item.content.start_date}}}} - 开始时间
- {{{{item.content.end_date}}}} - 结束时间

**项目经历区块** - 使用 repeat="sections.project":
- {{{{item.content.name}}}} - 项目名称
- {{{{item.content.description}}}} - 项目描述
- {{{{item.content.technologies}}}} - 技术栈 (数组，用逗号分隔显示)

**专业技能区块** - 使用 repeat="sections.skill":
- {{{{item.content.category}}}} - 技能类别
- {{{{item.content.skills}}}} - 技能列表 (数组，用逗号分隔显示)

## Design Guidelines:
1. 使用现代、专业的设计风格
2. 确保布局清晰、层次分明
3. 使用合适的颜色对比度
4. 考虑打印友好性
5. 为每个可编辑元素设置 data_path
6. 使用 {{{{variable}}}} 语法引用数据
7. **重要**：为每种 section 类型创建独立的容器节点，分别使用：
   - repeat="sections.experience" 循环工作经验
   - repeat="sections.education" 循环教育背景
   - repeat="sections.project" 循环项目经历
   - repeat="sections.skill" 循环专业技能
8. 每个循环容器内使用 item.content.xxx 访问数据

User request: {prompt}

{base_template_context}

Return a JSON object with:
- "name": 模板名称 (中文)
- "description": 模板描述 (中文)
- "ast": 完整的 AST 结构

Return ONLY valid JSON."""


PARSE_HTML_PROMPT = """You are an expert at parsing HTML/CSS into an AST structure for a resume template system.

Given the following HTML and CSS, generate an AST that represents the structure.

## HTML:
```html
{html_content}
```

## CSS:
```css
{css_content}
```

## AST Structure Required:
Each node should have:
- id: unique identifier
- type: root|header|section|text|list|grid|container|divider
- tag: the HTML tag
- class_name: CSS class names
- styles: inline styles as key-value pairs (use snake_case: font_size, not fontSize)
- content: text content if any
- data_path: if the content should bind to resume data (profile.name, profile.email, etc.)
- children: array of child nodes
- editable: true if content can be edited
- draggable: true if node can be dragged

## Important:
1. Convert CSS properties to snake_case (font-size → font_size)
2. Identify which parts should bind to resume data and set data_path
3. Use {{{{variable}}}} syntax for dynamic content
4. Mark repeating sections with "repeat" property

Return a JSON object with:
- "ast": the complete AST structure

Return ONLY valid JSON."""


async def generate_template_ast(prompt: str, base_ast: Optional[dict] = None) -> dict:
    """使用 AI 生成模板 AST"""
    llm = await get_llm_client()
    if not llm:
        return {"error": "LLM 未配置，请先在设置页面配置。"}

    base_template_context = ""
    if base_ast:
        base_template_context = f"""
## Base Template (modify based on this):
```json
{json.dumps(base_ast, indent=2, ensure_ascii=False)}
```
"""

    messages = [
        SystemMessage(content="You are a professional resume template designer. Output only valid JSON."),
        HumanMessage(content=GENERATE_TEMPLATE_PROMPT.format(
            prompt=prompt,
            base_template_context=base_template_context
        )),
    ]

    try:
        response = await llm.ainvoke(messages)
        content = response.content.strip()

        # 提取 JSON
        content = extract_json_from_response(content)

        # 尝试直接解析
        try:
            result = json.loads(content)
        except json.JSONDecodeError as e:
            # 尝试修复截断的 JSON
            result = try_fix_truncated_json(content)
            if result is None:
                return {"error": f"无法解析 AI 返回的 JSON: {str(e)}。响应可能被截断，请尝试简化模板需求。"}

        # 确保 AST 中的节点都有唯一 ID
        if "ast" in result and "root" in result["ast"]:
            ensure_node_ids(result["ast"]["root"])

        return result

    except json.JSONDecodeError as e:
        return {"error": f"无法解析 AI 返回的 JSON: {str(e)}"}
    except Exception as e:
        return {"error": f"生成模板失败: {str(e)[:100]}"}


async def parse_html_to_ast(html_content: str, css_content: str = "") -> dict:
    """解析 HTML/CSS 为 AST"""
    llm = await get_llm_client()
    if not llm:
        return {"error": "LLM 未配置，请先在设置页面配置。"}

    messages = [
        SystemMessage(content="You are an HTML/CSS parser. Output only valid JSON."),
        HumanMessage(content=PARSE_HTML_PROMPT.format(
            html_content=html_content,
            css_content=css_content
        )),
    ]

    try:
        response = await llm.ainvoke(messages)
        content = response.content.strip()

        # 提取 JSON
        content = extract_json_from_response(content)

        # 尝试直接解析
        try:
            result = json.loads(content)
        except json.JSONDecodeError as e:
            # 尝试修复截断的 JSON
            result = try_fix_truncated_json(content)
            if result is None:
                return {"error": f"无法解析 AI 返回的 JSON: {str(e)}。响应可能被截断。"}

        # 确保 AST 中的节点都有唯一 ID
        if "ast" in result and "root" in result["ast"]:
            ensure_node_ids(result["ast"]["root"])

        return result

    except json.JSONDecodeError as e:
        return {"error": f"无法解析 AI 返回的 JSON: {str(e)}"}
    except Exception as e:
        return {"error": f"解析 HTML 失败: {str(e)[:100]}"}


def ensure_node_ids(node: dict, prefix: str = ""):
    """确保每个节点都有唯一 ID"""
    if "id" not in node or not node["id"]:
        node["id"] = f"{prefix}{uuid.uuid4().hex[:8]}"

    if "children" in node and isinstance(node["children"], list):
        for i, child in enumerate(node["children"]):
            ensure_node_ids(child, f"{node['id']}-{i}-")


async def update_ast_node(ast: dict, node_id: str, updates: dict) -> dict:
    """更新 AST 中的特定节点"""

    def find_and_update(node: dict) -> bool:
        if node.get("id") == node_id:
            # 更新节点
            for key, value in updates.items():
                if key == "styles" and isinstance(value, dict):
                    if "styles" not in node:
                        node["styles"] = {}
                    node["styles"].update(value)
                else:
                    node[key] = value
            return True

        # 递归查找子节点
        if "children" in node and isinstance(node["children"], list):
            for child in node["children"]:
                if find_and_update(child):
                    return True

        return False

    if "root" in ast:
        find_and_update(ast["root"])

    return ast
