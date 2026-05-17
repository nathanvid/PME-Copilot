import json
import os
import sys
import urllib.request
import urllib.error

GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
PR_NUMBER = os.environ["PR_NUMBER"]
REPO = os.environ["REPO"]
HEAD_SHA = os.environ["HEAD_SHA"]

SEVERITY_EMOJI = {
    "CRITICAL": "🔴",
    "HIGH": "🟠",
    "MEDIUM": "🟡",
    "LOW": "⚪",
}

def github_request(method, url, data=None):
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"GitHub API error {e.code}: {e.read().decode()}", file=sys.stderr)
        return None

def load_claude_response():
    with open("claude_response.json") as f:
        raw = json.load(f)
    
    # OpenRouter → format OpenAI : choices[0].message.content
    choices = raw.get("choices", [])
    if not choices:
        print(f"Empty choices. Raw response: {raw}", file=sys.stderr)
        return []
    
    text = choices[0].get("message", {}).get("content", "").strip()
    
    # Strip markdown fences si présentes
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    
    return json.loads(text)

def post_review_comment(file, line, body):
    url = f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}/comments"
    data = {
        "body": body,
        "commit_id": HEAD_SHA,
        "path": file,
        "line": line,
        "side": "RIGHT",
    }
    return github_request("POST", url, data)

def format_comment(issue):
    emoji = SEVERITY_EMOJI.get(issue["severity"], "⚪")
    severity = issue["severity"]
    category = issue["category"]
    comment = issue["comment"]
    suggestion = issue.get("suggestion", "")
    
    body = f"{emoji} **[{severity}]** `{category}`\n\n{comment}"
    if suggestion:
        body += f"\n\n```typescript\n{suggestion}\n```"
    
    return body

def main():
    try:
        issues = load_claude_response()
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Failed to parse Claude response: {e}", file=sys.stderr)
        # Don't fail the CI — just skip comments
        return
    
    if not issues:
        print("No issues found — clean diff ✓")
        return
    
    posted = 0
    failed = 0
    
    for issue in issues:
        # Skip LOW severity to reduce noise initially
        if issue.get("severity") == "LOW":
            continue
        
        body = format_comment(issue)
        result = post_review_comment(
            file=issue["file"],
            line=issue["line"],
            body=body,
        )
        
        if result:
            posted += 1
        else:
            failed += 1
            print(f"Failed to post comment on {issue['file']}:{issue['line']}", file=sys.stderr)
    
    print(f"Posted {posted} comments, {failed} failed")
    
    # Write summary for next step
    with open("review_summary.json", "w") as f:
        json.dump({
            "total_issues": len(issues),
            "posted": posted,
            "by_severity": {
                sev: len([i for i in issues if i.get("severity") == sev])
                for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
            }
        }, f)

if __name__ == "__main__":
    main()