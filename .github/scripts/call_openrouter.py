import json
import os
import urllib.request
import urllib.error
import sys

OPENROUTER_API_KEY = os.environ["OPENROUTER_API_KEY"]

# Lecture du diff
with open("diff_truncated.txt") as f:
    diff = f.read()

# Lecture du system prompt
with open(".github/workflows/ai-review-prompt.txt") as f:
    system_prompt = f.read()

payload = {
    "model": "anthropic/claude-sonnet-4.6",
    "max_tokens": 4096,
    "messages": [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Review this git diff:\n\n{diff}"}
    ]
}

req = urllib.request.Request(
    "https://openrouter.ai/api/v1/chat/completions",
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req) as resp:
        response = json.loads(resp.read())
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    print(f"HTTP {e.code}: {error_body}", file=sys.stderr)
    sys.exit(1)

with open("claude_response.json", "w") as f:
    json.dump(response, f)

print("OpenRouter response saved ✓")