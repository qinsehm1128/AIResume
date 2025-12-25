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
    ui_context: dict
    intent: str
    response: str


# Prompts
ROUTER_PROMPT = """You are an intent classifier for a resume editor AI.

Analyze the user's message and classify their intent into one of these categories:
- "layout": User wants to change visual appearance (colors, fonts, layout, theme, spacing)
- "content": User wants to modify text content (add, edit, polish, translate, rewrite experiences)
- "general": General questions or greetings

User message: {message}

Current focused section: {focused_section}

Respond with ONLY one word: layout, content, or general"""


LAYOUT_PROMPT = """You are a resume layout assistant. Modify the layout configuration based on the user's request.

Current layout configuration:
{layout_config}

User request: {message}

Available layout options:
- theme: "modern-blue", "classic-black", "minimal-gray", "creative-purple"
- column_layout: "single-column", "two-column-3-7", "two-column-4-6"
- font_size: "12px", "14px", "16px"
- primary_color: any valid CSS color

Return a JSON object with ONLY the fields that need to change. Example:
{{"theme": "classic-black", "font_size": "16px"}}

If the user's request cannot be fulfilled, return:
{{"error": "explanation"}}

Return ONLY valid JSON."""


CONTENT_PROMPT = """You are a professional resume writer and editor. Help improve the resume content.

Current resume data:
{resume_data}

User request: {message}
Focused section: {focused_section}

IMPORTANT: Use the STAR method (Situation, Task, Action, Result) when improving experience descriptions.

Return a JSON object with:
- "message": Your helpful response to the user
- "updates": A list of updates to apply, each with:
  - "path": JSON path to update (e.g., "profile.summary" or "sections.0.content.description")
  - "value": New value

Example:
{{
  "message": "I've improved your job description using the STAR method.",
  "updates": [
    {{"path": "sections.0.content.description", "value": "Led a team of 5..."}}
  ]
}}

If no changes needed, return empty updates:
{{
  "message": "Your response here",
  "updates": []
}}

Return ONLY valid JSON."""


async def router_node(state: ResumeGraphState) -> ResumeGraphState:
    """Route user intent to appropriate agent"""
    llm = await get_llm_client()
    if not llm:
        state["intent"] = "general"
        state["response"] = "Please configure LLM settings first."
        return state

    last_message = state["messages"][-1]["content"] if state["messages"] else ""
    focused = state["ui_context"].get("focused_section_id", "none")

    messages = [
        HumanMessage(
            content=ROUTER_PROMPT.format(message=last_message, focused_section=focused)
        )
    ]

    response = await llm.ainvoke(messages)
    intent = response.content.strip().lower()

    if intent not in ["layout", "content", "general"]:
        intent = "general"

    state["intent"] = intent
    return state


async def layout_node(state: ResumeGraphState) -> ResumeGraphState:
    """Handle layout modification requests"""
    llm = await get_llm_client()
    if not llm:
        state["response"] = "LLM not configured."
        return state

    last_message = state["messages"][-1]["content"] if state["messages"] else ""

    messages = [
        SystemMessage(content="You are a JSON layout configurator. Output only valid JSON."),
        HumanMessage(
            content=LAYOUT_PROMPT.format(
                layout_config=json.dumps(state["layout_config"], indent=2),
                message=last_message,
            )
        ),
    ]

    response = await llm.ainvoke(messages)
    content = response.content.strip()

    # Clean JSON
    if content.startswith("```"):
        content = content.split("\n", 1)[1] if "\n" in content else content[3:]
    if content.endswith("```"):
        content = content[:-3]

    try:
        updates = json.loads(content.strip())
        if "error" in updates:
            state["response"] = updates["error"]
        else:
            state["layout_config"].update(updates)
            state["response"] = f"Layout updated: {', '.join(updates.keys())}"
    except json.JSONDecodeError:
        state["response"] = "I couldn't parse the layout changes. Please try again."

    return state


async def content_node(state: ResumeGraphState) -> ResumeGraphState:
    """Handle content modification requests"""
    llm = await get_llm_client()
    if not llm:
        state["response"] = "LLM not configured."
        return state

    last_message = state["messages"][-1]["content"] if state["messages"] else ""
    focused = state["ui_context"].get("focused_section_id", "none")

    messages = [
        SystemMessage(content="You are a professional resume editor. Output only valid JSON."),
        HumanMessage(
            content=CONTENT_PROMPT.format(
                resume_data=json.dumps(state["current_resume_data"], indent=2),
                message=last_message,
                focused_section=focused,
            )
        ),
    ]

    response = await llm.ainvoke(messages)
    content = response.content.strip()

    # Clean JSON
    if content.startswith("```"):
        content = content.split("\n", 1)[1] if "\n" in content else content[3:]
    if content.endswith("```"):
        content = content[:-3]

    try:
        result = json.loads(content.strip())
        state["response"] = result.get("message", "Content updated.")

        # Apply updates
        for update in result.get("updates", []):
            path = update.get("path", "")
            value = update.get("value")
            if path and value is not None:
                _apply_json_path(state["current_resume_data"], path, value)

    except json.JSONDecodeError:
        state["response"] = "I couldn't process the content changes. Please try again."

    return state


async def general_node(state: ResumeGraphState) -> ResumeGraphState:
    """Handle general queries"""
    llm = await get_llm_client()
    if not llm:
        state["response"] = "Hello! Please configure LLM settings to start editing your resume."
        return state

    last_message = state["messages"][-1]["content"] if state["messages"] else ""

    messages = [
        SystemMessage(
            content="""You are a helpful resume editor assistant.
            Help users with their resume-related questions.
            Be concise and professional."""
        ),
        HumanMessage(content=last_message),
    ]

    response = await llm.ainvoke(messages)
    state["response"] = response.content

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
        },
    )

    # Add edges to END
    graph.add_edge("layout", END)
    graph.add_edge("content", END)
    graph.add_edge("general", END)

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
        "ui_context": {"focused_section_id": focused_section_id},
        "intent": "",
        "response": "",
    }

    config = {"configurable": {"thread_id": thread_id}}
    result = await graph.ainvoke(state, config)

    # Add assistant response to messages
    result["messages"].append({"role": "assistant", "content": result["response"]})

    return {
        "message": result["response"],
        "resume_data": result["current_resume_data"],
        "layout_config": result["layout_config"],
        "messages": result["messages"],
        "intent": result["intent"],
    }
