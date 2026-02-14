import json
import time

import httpx


def main() -> None:
    payload = {
        "call": {
            "id": f"test-call-{int(time.time())}",
            "startedAt": "2026-02-14T10:00:00Z",
            "endedAt": "2026-02-14T10:03:00Z",
            "transcript": "Agent: Hi there. Customer: Not interested right now.",
            "status": "ended",
            "type": "webCall",
        }
    }

    with httpx.Client(timeout=20) as client:
        res = client.post("http://localhost:3000/webhook/call-completed", json=payload)
        print(res.status_code)
        print(json.dumps(res.json(), indent=2))


if __name__ == "__main__":
    main()
