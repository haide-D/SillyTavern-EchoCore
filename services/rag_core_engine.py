import sqlite3
import json
import httpx

class ContextOptimizationEngine:
    def __init__(self):
        # -------------------------------------------------------------------

        # -------------------------------------------------------------------
        """
        Database schema designed to track conversation states via fingerprints 
        instead of dumping raw historical chat logs.
        """
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS memory_snapshots (
                id                   INTEGER PRIMARY KEY AUTOINCREMENT,
                context_fingerprint  TEXT NOT NULL UNIQUE,
                session_id           TEXT NOT NULL,
                interaction_summary  TEXT NOT NULL,
                lead_profiles        TEXT,          -- Structured JSON of lead status/intent
                key_events           TEXT,          -- Key triggers extracted
                created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

    # -------------------------------------------------------------------

    # -------------------------------------------------------------------
    async def extract_and_compress_context(self, conversation_text: str, speakers: str):
        """
        Forces the LLM to compress raw conversations into strict JSON arrays 
        to prevent token bloat in downstream workflows.
        """
        prompt = f"""You are a memory compression assistant. Analyze the conversation and output STRICT JSON.
        
## Raw Conversation
{conversation_text}

## Entities Involved
{speakers}

## Output Requirements (Strict JSON ONLY, no markdown blocks):
{{
  "interaction_summary": "2-3 sentences summarizing the factual progression of the chat.",
  "lead_profiles": {{
    "Entity_1": {{
      "intent": "Current buying intent or interest level",
      "objections": "Any concerns raised during the chat",
      "current_state": "Current emotional or business state"
    }}
  }},
  "key_events": [
    {{"event_type": "inquiry|objection|booking_attempt|support",
     "description": "Factual description of the event"}}
  ]
}}

Rules:
- interaction_summary is REQUIRED.
- Do NOT output any conversational text. Must be a perfectly closed JSON object.
"""
        # API execution logic omitted for brevity...
        pass

    # -------------------------------------------------------------------

    # -------------------------------------------------------------------
    def assemble_dynamic_prompt(self, lead_id: str, current_fingerprints: list) -> str:
        """
        Retrieves static baselines and merges them dynamically with the latest 
        snapshots, injecting only necessary context to save API tokens.
        """
        sections = []

        # 1. Load Static Baselines (e.g., Company Info, Lead CRM Profile)
        profiles = self.db.get_static_profiles(lead_id)
        if profiles:
            profile_lines = [f"{k}: {v}" for k, v in profiles.items() if k not in self.skip_keys]
            sections.append("## Static Lead Baseline\n" + "\n".join(profile_lines))

        # 2. Load Dynamic Timelines (Recent interaction snapshots)
        snapshots = self.db.get_snapshots_by_fingerprints(current_fingerprints, limit=3)
        if snapshots:
            # Aggregate plot summaries
            summary_lines = [f"{i}. {snap['interaction_summary']}" for i, snap in enumerate(snapshots, 1)]
            sections.append("## Dynamic Interaction Evolution\n" + "\n".join(summary_lines))
            
            # Extract active events
            active_events = [
                f"- [{evt['event_type']}] {evt['description']}" 
                for snap in snapshots for evt in snap.get("key_events", [])
            ]
            if active_events:
                sections.append("## Core Influencing Factors\n" + "\n".join(active_events[:5]))

        return "\n\n".join(sections)