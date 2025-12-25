import json
from typing import TypedDict, Literal, Any, Annotated
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.services.llm import get_llm_client
from app.schemas import ResumeData, LayoutConfig


class ResumeGraphState(TypedDict):
    messages: list[dict]
    current_resume_data: dict
    layout_config: dict
    template_ast: dict | None  # 模板 AST 结构
    ui_context: dict
    drag_context: dict | None
    edit_mode: str
    images: list[dict] | None  # 图片数据列表
    intent: str
    response: str


def create_multimodal_content(text: str, images: list[dict] | None = None) -> list[dict] | str:
    """创建多模态消息内容（支持图片）"""
    if not images:
        return text

    content = [{"type": "text", "text": text}]
    for img in images:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{img['mime_type']};base64,{img['base64']}"
            }
        })
    return content


# Prompts
ROUTER_PROMPT = """You are an intent classifier for a resume editor AI.

Analyze the user's message and classify their intent into one of these categories:
- "layout": User wants to change visual appearance (colors, fonts, layout, theme, spacing)
- "content": User wants to modify text content (add, edit, polish, translate, rewrite experiences)
- "template": User wants to modify template structure or AST
- "general": General questions or greetings

User message: {message}

Current focused section: {focused_section}
Current edit mode: {edit_mode}
Dragged node: {drag_context}

If a node was dragged, pay special attention to what the user wants to do with it.
If edit_mode is "layout", prefer classifying as "layout".
If edit_mode is "template", prefer classifying as "template".
If edit_mode is "content", prefer classifying as "content".

Respond with ONLY one word: layout, content, template, or general"""


LAYOUT_PROMPT = """You are a professional resume layout designer. Modify the layout configuration based on the user's request.

Current layout configuration:
{layout_config}

User request: {message}

## Available Layout Options:

### Basic Settings:
- theme: "modern-blue", "classic-black", "minimal-gray", "creative-purple", "elegant-gold", "tech-green"
- column_layout: "single-column", "two-column-3-7", "two-column-4-6"
- font_size: "12px", "14px", "16px"
- primary_color: any valid CSS color (e.g., "#2563eb", "#1a1a1a", "#059669")

### Spacing & Typography:
- section_spacing: "16px", "20px", "24px", "32px" (space between sections)
- line_height: "1.4", "1.6", "1.8", "2.0"
- font_family: "system", "serif", "mono"
- header_font_size: "24px", "28px", "32px", "36px"

### Visual Style:
- border_style: "none", "solid", "dashed"
- border_radius: "0px", "4px", "8px", "12px", "16px"
- background_color: any valid CSS color
- header_background: "transparent", or any valid CSS color
- shadow: "none", "sm", "md", "lg", "xl"

### Layout Style:
- header_alignment: "left", "center", "right"
- section_style: "card" (with shadow), "flat" (no decoration), "bordered" (with border)
- accent_style: "border-left", "underline", "background", "none"

## Preset Themes (use these for quick beautification):
When user asks for "美化" or "beautify", consider applying a complete theme:

1. **Professional Modern** (专业现代风):
   {{"theme": "modern-blue", "primary_color": "#2563eb", "section_style": "card", "shadow": "md", "border_radius": "12px", "header_alignment": "center", "accent_style": "border-left", "section_spacing": "24px"}}

2. **Classic Elegant** (经典优雅风):
   {{"theme": "classic-black", "primary_color": "#1f2937", "section_style": "bordered", "shadow": "none", "border_radius": "0px", "header_alignment": "left", "accent_style": "underline", "font_family": "serif", "section_spacing": "20px"}}

3. **Minimalist Clean** (极简清新风):
   {{"theme": "minimal-gray", "primary_color": "#6b7280", "section_style": "flat", "shadow": "none", "border_radius": "4px", "header_alignment": "left", "accent_style": "none", "section_spacing": "32px", "line_height": "1.8"}}

4. **Creative Bold** (创意大胆风):
   {{"theme": "creative-purple", "primary_color": "#7c3aed", "section_style": "card", "shadow": "lg", "border_radius": "16px", "header_alignment": "center", "accent_style": "background", "header_font_size": "32px"}}

5. **Tech Modern** (科技现代风):
   {{"theme": "tech-green", "primary_color": "#059669", "section_style": "card", "shadow": "md", "border_radius": "8px", "header_alignment": "left", "accent_style": "border-left", "font_family": "mono"}}

Return a JSON object with ONLY the fields that need to change.

If the user's request cannot be fulfilled, return:
{{"error": "explanation"}}

Return ONLY valid JSON. Respond in Chinese when explaining."""


CONTENT_PROMPT = """You are a professional resume writer and editor. Help improve the resume content.

Current resume data:
{resume_data}

User request: {message}
Focused section: {focused_section}
Target node (dragged by user): {drag_context}

IMPORTANT:
- Use the STAR method (Situation, Task, Action, Result) when improving experience descriptions.
- If a target node is specified, focus your changes on that specific element.
- If drag_context has a data_path, use it to identify which part of resume_data to modify.

Return a JSON object with:
- "message": Your helpful response to the user (in Chinese)
- "updates": A list of updates to apply, each with:
  - "path": JSON path to update (e.g., "profile.summary" or "sections.0.content.description")
  - "value": New value

Example:
{{
  "message": "我已经使用 STAR 法则优化了您的工作描述。",
  "updates": [
    {{"path": "sections.0.content.description", "value": "带领5人团队..."}}
  ]
}}

If no changes needed, return empty updates:
{{
  "message": "您的回复内容",
  "updates": []
}}

Return ONLY valid JSON."""


TEMPLATE_PROMPT = """You are a template structure editor for resume templates.
The user wants to modify the template AST structure.

Current template AST:
{template_ast}

Current dragged node: {drag_context}

User request: {message}

## Understanding the Template AST Structure:
The AST (Abstract Syntax Tree) defines the visual structure of the resume. Each node has:
- id: Unique identifier
- tag: HTML tag (div, span, h1, h2, p, etc.)
- styles: CSS styles in snake_case (font_size, background_color, padding, etc.)
- content: Text content with variable bindings like {{{{profile.name}}}}
- children: Child nodes
- repeat: Data path for loops (e.g., "sections.experience", "sections.skill")
- class_name: CSS class name

## Available Operations:
1. update_styles: Modify node styles (fonts, colors, spacing, borders, etc.)
2. update_content: Change content template or variable bindings
3. add_child: Add a new child node
4. remove_node: Remove a node by id
5. reorder: Change order of children

## Style Properties (use snake_case):
- font_size, font_weight, font_family
- color, background_color
- padding, margin (can use padding_top, padding_left, etc.)
- border, border_radius, border_left
- display, flex_direction, justify_content, align_items
- gap, width, height

Respond with a JSON object containing the COMPLETE UPDATED AST:
{{
  "message": "Your response in Chinese explaining what was changed",
  "template_ast": {{
    "root": {{...complete updated AST root node...}}
  }}
}}

IMPORTANT: You must return the complete template_ast with all modifications applied, not just the changes.

If no changes needed or operation is not supported:
{{
  "message": "说明为什么无法执行操作",
  "template_ast": null
}}

Return ONLY valid JSON."""


async def router_node(state: ResumeGraphState) -> ResumeGraphState:
    """Route user intent to appropriate agent"""
    llm = await get_llm_client()
    if not llm:
        state["intent"] = "general"
        state["response"] = "请先在设置页面配置 LLM 参数。"
        return state

    last_message = state["messages"][-1]["content"] if state["messages"] else ""
    focused = state["ui_context"].get("focused_section_id", "none")
    edit_mode = state.get("edit_mode", "content")
    drag_context = state.get("drag_context")
    drag_str = json.dumps(drag_context, ensure_ascii=False) if drag_context else "none"
    has_images = bool(state.get("images"))

    # 如果有图片，在提示中提及
    image_hint = "\n\nNote: User has attached image(s). Consider if they want to use the image as reference for design/layout." if has_images else ""

    messages = [
        HumanMessage(
            content=ROUTER_PROMPT.format(
                message=last_message,
                focused_section=focused,
                edit_mode=edit_mode,
                drag_context=drag_str,
            ) + image_hint
        )
    ]

    try:
        response = await llm.ainvoke(messages)
        intent = response.content.strip().lower()

        if intent not in ["layout", "content", "template", "general"]:
            intent = "general"

        state["intent"] = intent
    except Exception as e:
        print(f"Router error: {e}")
        state["intent"] = "general"
        state["response"] = f"AI 服务调用失败，请检查 LLM 配置。错误：{str(e)[:100]}"

    return state


async def layout_node(state: ResumeGraphState) -> ResumeGraphState:
    """Handle layout modification requests"""
    llm = await get_llm_client()
    if not llm:
        state["response"] = "LLM 未配置。"
        return state

    last_message = state["messages"][-1]["content"] if state["messages"] else ""
    images = state.get("images")

    prompt_text = LAYOUT_PROMPT.format(
        layout_config=json.dumps(state["layout_config"], indent=2),
        message=last_message,
    )

    # 如果有图片，添加参考提示
    if images:
        prompt_text += "\n\n用户附带了参考图片，请根据图片中的设计风格调整布局配置。"

    messages = [
        SystemMessage(content="You are a JSON layout configurator. Output only valid JSON."),
        HumanMessage(content=create_multimodal_content(prompt_text, images)),
    ]

    try:
        response = await llm.ainvoke(messages)
        content = response.content.strip()

        # Clean JSON
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]

        updates = json.loads(content.strip())
        if "error" in updates:
            state["response"] = updates["error"]
        else:
            state["layout_config"].update(updates)
            state["response"] = f"布局已更新：{', '.join(updates.keys())}"
    except json.JSONDecodeError:
        state["response"] = "无法解析布局更改，请重试。"
    except Exception as e:
        print(f"Layout error: {e}")
        state["response"] = f"布局更新失败：{str(e)[:100]}"

    return state


async def content_node(state: ResumeGraphState) -> ResumeGraphState:
    """Handle content modification requests"""
    llm = await get_llm_client()
    if not llm:
        state["response"] = "LLM 未配置。"
        return state

    last_message = state["messages"][-1]["content"] if state["messages"] else ""
    focused = state["ui_context"].get("focused_section_id", "none")
    drag_context = state.get("drag_context")
    drag_str = json.dumps(drag_context, ensure_ascii=False) if drag_context else "none"
    images = state.get("images")

    prompt_text = CONTENT_PROMPT.format(
        resume_data=json.dumps(state["current_resume_data"], indent=2, ensure_ascii=False),
        message=last_message,
        focused_section=focused,
        drag_context=drag_str,
    )

    messages = [
        SystemMessage(content="You are a professional resume editor. Output only valid JSON. Respond in Chinese."),
        HumanMessage(content=create_multimodal_content(prompt_text, images)),
    ]

    try:
        response = await llm.ainvoke(messages)
        content = response.content.strip()

        # Clean JSON
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]

        result = json.loads(content.strip())
        state["response"] = result.get("message", "内容已更新。")

        # Apply updates
        for update in result.get("updates", []):
            path = update.get("path", "")
            value = update.get("value")
            if path and value is not None:
                _apply_json_path(state["current_resume_data"], path, value)

    except json.JSONDecodeError:
        state["response"] = "无法处理内容更改，请重试。"
    except Exception as e:
        print(f"Content error: {e}")
        state["response"] = f"内容更新失败：{str(e)[:100]}"

    return state


async def general_node(state: ResumeGraphState) -> ResumeGraphState:
    """Handle general queries"""
    llm = await get_llm_client()
    if not llm:
        state["response"] = "您好！请先在设置页面配置 LLM 参数后，即可开始编辑简历。"
        return state

    last_message = state["messages"][-1]["content"] if state["messages"] else ""

    messages = [
        SystemMessage(
            content="""You are a helpful resume editor assistant.
            Help users with their resume-related questions.
            Be concise and professional.
            Always respond in Chinese."""
        ),
        HumanMessage(content=last_message),
    ]

    try:
        response = await llm.ainvoke(messages)
        state["response"] = response.content
    except Exception as e:
        print(f"General error: {e}")
        state["response"] = f"AI 服务调用失败：{str(e)[:100]}"

    return state


async def template_node(state: ResumeGraphState) -> ResumeGraphState:
    """Handle template/AST modification requests"""
    llm = await get_llm_client()
    if not llm:
        state["response"] = "LLM 未配置。"
        return state

    last_message = state["messages"][-1]["content"] if state["messages"] else ""
    drag_context = state.get("drag_context")
    drag_str = json.dumps(drag_context, ensure_ascii=False) if drag_context else "none"
    template_ast = state.get("template_ast")
    template_ast_str = json.dumps(template_ast, ensure_ascii=False, indent=2) if template_ast else "null"

    messages = [
        SystemMessage(content="You are a template structure editor. Output only valid JSON. Respond in Chinese."),
        HumanMessage(
            content=TEMPLATE_PROMPT.format(
                template_ast=template_ast_str,
                drag_context=drag_str,
                message=last_message,
            )
        ),
    ]

    try:
        response = await llm.ainvoke(messages)
        content = response.content.strip()

        # Clean JSON
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]

        result = json.loads(content.strip())
        state["response"] = result.get("message", "模板结构已更新。")

        # Apply template_ast updates
        new_template_ast = result.get("template_ast")
        if new_template_ast and isinstance(new_template_ast, dict) and "root" in new_template_ast:
            state["template_ast"] = new_template_ast
            state["response"] += "\n\n✅ 模板已更新，预览已刷新。"

    except json.JSONDecodeError:
        state["response"] = "无法处理模板更改，请重试。"
    except Exception as e:
        print(f"Template error: {e}")
        state["response"] = f"模板更新失败：{str(e)[:100]}"

    return state


def _apply_json_path(data: dict, path: str, value: Any):
    """Apply a value at a JSON path"""
    parts = path.split(".")
    current = data

    for i, part in enumerate(parts[:-1]):
        if part.isdigit():
            idx = int(part)
            if isinstance(current, list) and idx < len(current):
                current = current[idx]
            else:
                return
        else:
            if part not in current:
                current[part] = {}
            current = current[part]

    last_part = parts[-1]
    if last_part.isdigit() and isinstance(current, list):
        idx = int(last_part)
        if idx < len(current):
            current[idx] = value
    else:
        current[last_part] = value


def route_by_intent(state: ResumeGraphState) -> str:
    """Route to appropriate node based on intent"""
    return state.get("intent", "general")


def create_resume_graph():
    """Create the resume editing graph"""
    graph = StateGraph(ResumeGraphState)

    # Add nodes
    graph.add_node("router", router_node)
    graph.add_node("layout", layout_node)
    graph.add_node("content", content_node)
    graph.add_node("general", general_node)
    graph.add_node("template", template_node)

    # Set entry point
    graph.set_entry_point("router")

    # Add conditional edges from router
    graph.add_conditional_edges(
        "router",
        route_by_intent,
        {
            "layout": "layout",
            "content": "content",
            "general": "general",
            "template": "template",
        },
    )

    # Add edges to END
    graph.add_edge("layout", END)
    graph.add_edge("content", END)
    graph.add_edge("general", END)
    graph.add_edge("template", END)

    # Compile with memory checkpointer
    memory = MemorySaver()
    return graph.compile(checkpointer=memory)


# Global graph instance
_graph = None


def get_graph():
    """Get or create the graph instance"""
    global _graph
    if _graph is None:
        _graph = create_resume_graph()
    return _graph


async def process_message(
    message: str,
    resume_data: dict,
    layout_config: dict,
    messages: list,
    focused_section_id: str | None = None,
    drag_context: dict | None = None,
    edit_mode: str = "content",
    images: list[dict] | None = None,
    template_ast: dict | None = None,
    thread_id: str = "default",
) -> dict:
    """Process a user message through the graph"""
    graph = get_graph()

    # Add new message to history
    new_messages = messages + [{"role": "user", "content": message}]

    state: ResumeGraphState = {
        "messages": new_messages,
        "current_resume_data": resume_data,
        "layout_config": layout_config,
        "template_ast": template_ast,
        "ui_context": {"focused_section_id": focused_section_id},
        "drag_context": drag_context,
        "edit_mode": edit_mode,
        "images": images,
        "intent": "",
        "response": "",
    }

    config = {"configurable": {"thread_id": thread_id}}

    try:
        result = await graph.ainvoke(state, config)

        # Add assistant response to messages
        result["messages"].append({"role": "assistant", "content": result["response"]})

        return {
            "message": result["response"],
            "resume_data": result["current_resume_data"],
            "layout_config": result["layout_config"],
            "template_ast": result.get("template_ast"),
            "messages": result["messages"],
            "intent": result["intent"],
        }
    except Exception as e:
        print(f"Graph execution error: {e}")
        return {
            "message": f"处理消息时出错：{str(e)[:100]}",
            "resume_data": resume_data,
            "layout_config": layout_config,
            "template_ast": template_ast,
            "messages": new_messages + [{"role": "assistant", "content": f"处理消息时出错：{str(e)[:100]}"}],
            "intent": "error",
        }
