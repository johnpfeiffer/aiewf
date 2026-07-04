#!/bin/bash
# Scrape asn_slot session IDs from the AI Engineer World's Fair schedule page
# The data lives in a Next.js __NEXT_DATA__ script tag as JSON
# Output: app/src/data/asn-sessions.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_FILE="$SCRIPT_DIR/../app/src/data/asn-sessions.json"

echo "Fetching schedule page..."
HTML=$(curl -s 'https://www.ai.engineer/worldsfair/schedule?view=list')

echo "Extracting __NEXT_DATA__ JSON and building mapping..."
echo "$HTML" | python3 -c "
import json
import sys
import re

html = sys.stdin.read()

# Extract the __NEXT_DATA__ JSON from the script tag
match = re.search(r'<script id=\"__NEXT_DATA__\" type=\"application/json\">(.*?)</script>', html)
if not match:
    print('ERROR: Could not find __NEXT_DATA__ script tag', file=sys.stderr)
    sys.exit(1)

data = json.loads(match.group(1))
sessions = data['props']['pageProps']['sessions']

# Build the mapping: include all fields that help cross-reference with sessions.json
output = []
for s in sessions:
    entry = {
        'sessionId': s.get('sessionId', ''),
        'title': s.get('title', ''),
        'day': s.get('day', ''),
        'time': s.get('time', ''),
        'room': s.get('room', ''),
        'type': s.get('type', ''),
        'track': s.get('track', ''),
    }
    output.append(entry)

# Sort by day, time, room for readability
output.sort(key=lambda x: (x['day'], x['time'], x['room']))

result = {
    'source': 'https://www.ai.engineer/worldsfair/schedule?view=list',
    'scraped': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'totalSessions': len(output),
    'sessions': output
}

print(json.dumps(result, indent=2, ensure_ascii=False))
" > "$OUTPUT_FILE"

COUNT=$(python3 -c "import json; d=json.load(open('$OUTPUT_FILE')); print(d['totalSessions'])")
echo "Done! Wrote $COUNT sessions to $OUTPUT_FILE"
