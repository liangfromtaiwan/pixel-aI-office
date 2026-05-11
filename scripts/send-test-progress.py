#!/usr/bin/env python3
"""
Send demo task progress updates to the local webhook endpoint.

Requires:
  pip install requests
"""

from __future__ import annotations

import os
import time
from copy import deepcopy

import requests

WEBHOOK_URL = os.getenv("WEBHOOK_URL", "http://localhost:3000/api/tasks/update")
EXTERNAL_TASK_ID = os.getenv("EXTERNAL_TASK_ID", "claude_task_001")

BASE_PAYLOAD = {
    "externalTaskId": EXTERNAL_TASK_ID,
    "aiToolName": "Claude",
    "title": "Landing page copy generation",
    "description": "Generate first draft for product landing page",
    "status": "in_progress",
    "progress": 65,
    "currentStage": "Writing first draft",
    "log": "Claude is generating section headlines",
}

UPDATES = [
    {
        "status": "not_started",
        "progress": 0,
        "currentStage": "Queued",
        "log": "Task created and waiting to start",
    },
    {
        "status": "in_progress",
        "progress": 35,
        "currentStage": "Collecting references",
        "log": "Claude is gathering source material",
    },
    {
        "status": "in_progress",
        "progress": 65,
        "currentStage": "Writing first draft",
        "log": "Claude is generating section headlines",
    },
    {
        "status": "completed",
        "progress": 100,
        "currentStage": "Draft completed",
        "log": "First draft delivered successfully",
    },
]


def send_update(step_payload: dict, step_idx: int) -> None:
    payload = deepcopy(BASE_PAYLOAD)
    payload.update(step_payload)
    payload["externalTaskId"] = EXTERNAL_TASK_ID

    print(f"[{step_idx}] Sending update: status={payload['status']} progress={payload['progress']}%")
    response = requests.post(WEBHOOK_URL, json=payload, timeout=10)
    response.raise_for_status()
    body = response.json()
    print(f"    -> OK ({response.status_code}) taskId={body.get('task', {}).get('id', 'n/a')}")


def main() -> None:
    print(f"Webhook URL: {WEBHOOK_URL}")
    print(f"External Task ID: {EXTERNAL_TASK_ID}")

    for idx, update in enumerate(UPDATES, start=1):
        send_update(update, idx)
        if idx < len(UPDATES):
            time.sleep(1.2)

    print("Done. Open the dashboard and refresh/auto-sync to see updates.")


if __name__ == "__main__":
    main()

