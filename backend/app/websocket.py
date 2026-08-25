import asyncio
import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger("agentguard.websocket")


class WebSocketManager:
    """
    Manages active WebSocket connections grouped by user_id for real-time dashboard updates.
    """

    def __init__(self):
        # user_id -> set of active WebSockets
        self._active_connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        async with self._lock:
            if user_id not in self._active_connections:
                self._active_connections[user_id] = set()
            self._active_connections[user_id].add(websocket)
        logger.info(f"WebSocket client connected for user {user_id}. Total: {len(self._active_connections[user_id])}")

    async def disconnect(self, websocket: WebSocket, user_id: str):
        async with self._lock:
            if user_id in self._active_connections:
                self._active_connections[user_id].discard(websocket)
                if not self._active_connections[user_id]:
                    del self._active_connections[user_id]
        logger.info(f"WebSocket client disconnected for user {user_id}")

    async def broadcast_to_user(self, user_id: str, event_type: str, data: dict):
        """Broadcasts a JSON message to all open connections belonging to user_id."""
        async with self._lock:
            connections = list(self._active_connections.get(user_id, set()))

        if not connections:
            return

        payload = json.dumps({"event": event_type, "data": data}, default=str)
        disconnected = []

        for ws in connections:
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending to websocket for user {user_id}: {e}")
                disconnected.append(ws)

        if disconnected:
            async with self._lock:
                for ws in disconnected:
                    if user_id in self._active_connections:
                        self._active_connections[user_id].discard(ws)


# Global WebSocket Manager singleton
ws_manager = WebSocketManager()
