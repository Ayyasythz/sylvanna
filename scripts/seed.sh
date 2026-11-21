#!/usr/bin/env bash
# Fills a local backend with sample markets and balances.
#   WINDRUNNER_ADMIN_KEY=secret ./scripts/seed.sh [url] [account_id...]
set -euo pipefail

: "${WINDRUNNER_ADMIN_KEY:?set WINDRUNNER_ADMIN_KEY}"
url="${1:-http://127.0.0.1:8080}"
shift || true
accounts=("${@:-1 2}")

post() {
  curl -sS -X POST "$url$1" -H "authorization: Bearer $WINDRUNNER_ADMIN_KEY" \
    -H 'content-type: application/json' -d "$2"
  echo
}

post /admin/markets '{"market":1,"info":{"title":"Will BTC hit $150,000 before the end of 2026?","description":"Resolves Yes if the BTC/USD spot price reaches $150,000 on any major exchange before December 31, 2026.","closes_at":1798675200000}}'
post /admin/markets '{"market":2,"info":{"title":"Will Indonesia qualify for the 2030 World Cup?","description":"Resolves Yes if the Indonesian men'"'"'s national team secures a place in the 2030 World Cup finals."}}'
post /admin/markets '{"market":3,"info":{"title":"Will Bank Indonesia cut its benchmark rate at the next meeting?","description":"Resolves Yes if Bank Indonesia announces a BI-Rate cut at its next Board of Governors meeting."}}'
post /admin/markets '{"market":4,"info":{"title":"Will ETH close above $5,000 on December 31, 2026?","description":"Resolves Yes if the ETH/USD daily close on December 31, 2026 (UTC) is above $5,000.","closes_at":1798761600000}}'
post /admin/markets '{"market":5,"info":{"title":"Will Jakarta MRT Phase 2 open to passengers before 2028?","description":"Resolves Yes if any station on Jakarta MRT Phase 2 opens to paying passengers before January 1, 2028.","closes_at":1830297600000}}'
post /admin/markets '{"market":6,"info":{"title":"Will a Southeast Asian film win an Oscar in 2027?","description":"Resolves Yes if a film produced primarily in Southeast Asia wins any Academy Award at the 2027 ceremony."}}'

for account in ${accounts[@]}; do
  post /admin/deposits "{\"account\":$account,\"amount\":1000000000}"
done
