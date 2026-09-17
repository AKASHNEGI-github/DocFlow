#!/usr/bin/env bash
set -euo pipefail
API="http://localhost:4000/api/v1"
pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; exit 1; }
assert_eq() { [ "$1" = "$2" ] && pass "$3" || { echo "    expected [$2] got [$1]"; fail "$3"; }; }

echo "== 1. Admin login =="
ADMIN_TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"aditi.singh@docflow.admin","password":"password"}' | jq -r '.data.accessToken')
[ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ] && pass "admin login" || fail "admin login"

echo "== 2. Admin creates editor/reviewer/publisher =="
mkuser() {
  curl -s -X POST $API/admin/users -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
    -d "{\"fullName\":\"$1\",\"email\":\"$2\",\"password\":\"Password123\",\"role\":\"$3\"}"
}
EDITOR_ID=$(mkuser "Ed Itor" "editor1@docflow.local" "editor" | jq -r '.data.userId')
REVIEWER_ID=$(mkuser "Rev Iewer" "reviewer1@docflow.local" "reviewer" | jq -r '.data.userId')
PUBLISHER_ID=$(mkuser "Pub Lisher" "publisher1@docflow.local" "publisher" | jq -r '.data.userId')
[ -n "$EDITOR_ID" ] && [ -n "$REVIEWER_ID" ] && [ -n "$PUBLISHER_ID" ] && pass "3 users created ($EDITOR_ID/$REVIEWER_ID/$PUBLISHER_ID)" || fail "user creation"

echo "== 3. Self-register an author =="
REG=$(curl -s -X POST $API/auth/register -H 'Content-Type: application/json' -d '{"fullName":"Anna Author","email":"author1@docflow.local","password":"Password123"}')
AUTHOR_TOKEN=$(echo "$REG" | jq -r '.data.accessToken')
AUTHOR_ROLE=$(echo "$REG" | jq -r '.data.user.role')
assert_eq "$AUTHOR_ROLE" "author" "self-register defaults to author"

echo "== 4. Create a document (Doc Onboard) =="
DOC=$(curl -s -X POST $API/documents/new -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' \
  -d '{"category":"Engineering","title":"Transformers","content":"<p>Initial content</p>"}')
DOC_ID=$(echo "$DOC" | jq -r '.data.documentId')
DOC_NAME=$(echo "$DOC" | jq -r '.data.documentName')
assert_eq "$DOC_NAME" "V1 - Transformers" "document_name composed correctly"

echo "== 5. Appears in Draft/My Documents =="
DRAFT_COUNT=$(curl -s $API/draft/all -H "Authorization: Bearer $AUTHOR_TOKEN" | jq '.data | length')
assert_eq "$DRAFT_COUNT" "1" "doc listed in draft/all"

echo "== 6. Promote Draft -> Editorial =="
PROMOTE=$(curl -s -X POST $API/draft/promote/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"editorIds\":[$EDITOR_ID]}")
STAGE=$(echo "$PROMOTE" | jq -r '.data.stage')
assert_eq "$STAGE" "EDITORIAL" "documents.stage advances to EDITORIAL immediately on promote"

echo "== 7. Editor logs in and sees it in for-approval =="
EDITOR_TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"editor1@docflow.local","password":"Password123"}' | jq -r '.data.accessToken')
FORAPPROVAL=$(curl -s $API/editorial/for-approval -H "Authorization: Bearer $EDITOR_TOKEN" | jq '.data | length')
assert_eq "$FORAPPROVAL" "1" "editor sees 1 item in for-approval"

echo "== 8. Editor approves =="
ACTION1=$(curl -s -X POST $API/editorial/action/$DOC_ID -H "Authorization: Bearer $EDITOR_TOKEN" -H 'Content-Type: application/json' -d '{"action":"APPROVED"}')
echo "$ACTION1" | jq -e '.code < 300' > /dev/null && pass "editor approve succeeded" || fail "editor approve"

echo "== 9. Second editor (none assigned) cannot act again / editor cannot double-act =="
DOUBLE=$(curl -s -X POST $API/editorial/action/$DOC_ID -H "Authorization: Bearer $EDITOR_TOKEN" -H 'Content-Type: application/json' -d '{"action":"APPROVED"}')
DOUBLE_MSG=$(echo "$DOUBLE" | jq -r '.message')
echo "  (expected conflict) got: $DOUBLE_MSG"
echo "$DOUBLE" | jq -e '.code >= 400' > /dev/null && pass "cannot act twice on resolved request" || fail "double-action guard"

echo "== 10. Author promotes Editorial -> Review =="
PROMOTE2=$(curl -s -X POST $API/editorial/promote/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d "{\"reviewerIds\":[$REVIEWER_ID]}")
STAGE2=$(echo "$PROMOTE2" | jq -r '.data.stage')
assert_eq "$STAGE2" "REVIEW" "stage advances to REVIEW"

echo "== 11. Reviewer approves =="
REVIEWER_TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"reviewer1@docflow.local","password":"Password123"}' | jq -r '.data.accessToken')
curl -s -X POST $API/review/action/$DOC_ID -H "Authorization: Bearer $REVIEWER_TOKEN" -H 'Content-Type: application/json' -d '{"action":"APPROVED"}' | jq -e '.code < 300' > /dev/null && pass "reviewer approve" || fail "reviewer approve"

echo "== 12. Author promotes Review -> Publication =="
PROMOTE3=$(curl -s -X POST $API/review/promote/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d "{\"publisherIds\":[$PUBLISHER_ID]}")
STAGE3=$(echo "$PROMOTE3" | jq -r '.data.stage')
assert_eq "$STAGE3" "PUBLICATION" "stage advances to PUBLICATION"

echo "== 13. Publisher REJECTS first (unpublish path) =="
PUBLISHER_TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"publisher1@docflow.local","password":"Password123"}' | jq -r '.data.accessToken')
REJECT=$(curl -s -X POST $API/publication/action/$DOC_ID -H "Authorization: Bearer $PUBLISHER_TOKEN" -H 'Content-Type: application/json' -d '{"action":"REJECTED"}')
STAGE_AFTER_REJECT=$(echo "$REJECT" | jq -r '.data.stage')
assert_eq "$STAGE_AFTER_REJECT" "PUBLICATION" "unpublish does NOT revert stage (stays PUBLICATION)"

echo "== 14. Author re-promotes directly (no need to go back through Review) =="
REPROMOTE=$(curl -s -X POST $API/publication/repromote/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d "{\"publisherIds\":[$PUBLISHER_ID]}")
echo "$REPROMOTE" | jq -e '.code < 300' > /dev/null && pass "repromote after unpublish" || fail "repromote after unpublish"

echo "== 15. Publisher APPROVES (publish!) =="
PUBLISH=$(curl -s -X POST $API/publication/action/$DOC_ID -H "Authorization: Bearer $PUBLISHER_TOKEN" -H 'Content-Type: application/json' -d '{"action":"APPROVED"}')
STAGE_LIVE=$(echo "$PUBLISH" | jq -r '.data.stage')
IS_LOCKED=$(echo "$PUBLISH" | jq -r '.data.isLocked')
assert_eq "$STAGE_LIVE" "LIVE" "stage advances to LIVE"
assert_eq "$IS_LOCKED" "true" "document is locked after going live"

echo "== 16. Shows up in Home feed (public, unauthenticated-role-wise but needs any auth) =="
FEED=$(curl -s $API/live/feed -H "Authorization: Bearer $REVIEWER_TOKEN" | jq --arg id "$DOC_ID" '.data | map(select(.documentId == ($id | tonumber))) | length')
assert_eq "$FEED" "1" "doc visible in Home feed to a different user"

echo "== 17. Shows up in author's personal Live list =="
MYLIVE=$(curl -s $API/live/all -H "Authorization: Bearer $AUTHOR_TOKEN" | jq '.data | length')
assert_eq "$MYLIVE" "1" "doc visible in author's personal Live list"

echo "== 18. Editing a locked/live doc is rejected =="
EDIT_LIVE=$(curl -s -X PUT $API/documents/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d '{"content":"<p>hacked</p>"}')
echo "$EDIT_LIVE" | jq -e '.code >= 400' > /dev/null && pass "cannot edit a live/locked document" || fail "live edit guard"

echo "== 19. Upgrade creates a new v2 in Draft =="
UPGRADE=$(curl -s -X POST $API/live/upgrade/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d '{"title":"Transformers","content":"<p>v2 content</p>"}')
V2_ID=$(echo "$UPGRADE" | jq -r '.data.documentId')
V2_NAME=$(echo "$UPGRADE" | jq -r '.data.documentName')
V2_VERSION=$(echo "$UPGRADE" | jq -r '.data.versionNo')
assert_eq "$V2_NAME" "V2 - Transformers" "v2 document_name composed correctly"
assert_eq "$V2_VERSION" "2" "v2 version_no is 2"

echo "== 20. v1 still fully live while v2 sits in Draft =="
FEED_STILL=$(curl -s $API/live/feed -H "Authorization: Bearer $REVIEWER_TOKEN" | jq --arg id "$DOC_ID" '.data | map(select(.documentId == ($id | tonumber))) | length')
assert_eq "$FEED_STILL" "1" "v1 unaffected while v2 upgrade in flight"

echo "== 21. A second concurrent upgrade attempt on v1 is blocked (one in-flight per family) =="
UPGRADE2=$(curl -s -X POST $API/live/upgrade/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d '{"title":"Transformers","content":"<p>another v2 attempt</p>"}')
echo "$UPGRADE2" | jq -e '.code >= 400' > /dev/null && pass "second concurrent upgrade blocked" || fail "concurrent-upgrade guard"

echo "== 22. Deletion request blocked while upgrade in flight =="
DELREQ_BLOCKED=$(curl -s -X POST $API/deletion/request/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"reason\":\"test\",\"editorId\":$EDITOR_ID,\"reviewerId\":$REVIEWER_ID,\"publisherId\":$PUBLISHER_ID}")
echo "$DELREQ_BLOCKED" | jq -e '.code >= 400' > /dev/null && pass "deletion request blocked while upgrade in flight" || fail "deletion-vs-upgrade guard"

echo "== 23. Abandon the v2 upgrade (delete it from Draft) so deletion can proceed =="
curl -s -X DELETE $API/documents/$V2_ID -H "Authorization: Bearer $AUTHOR_TOKEN" | jq -e '.code < 300' > /dev/null && pass "v2 draft deleted" || fail "delete v2 draft"

echo "== 24. Now the deletion request succeeds =="
DELREQ=$(curl -s -X POST $API/deletion/request/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"reason\":\"outdated\",\"editorId\":$EDITOR_ID,\"reviewerId\":$REVIEWER_ID,\"publisherId\":$PUBLISHER_ID}")
DEL_REQ_ID=$(echo "$DELREQ" | jq -r '.data.deleteRequestId')
[ -n "$DEL_REQ_ID" ] && [ "$DEL_REQ_ID" != "null" ] && pass "deletion request raised ($DEL_REQ_ID)" || fail "raise deletion request"

echo "== 25. 1st approve (editor) - still pending =="
D1=$(curl -s -X POST $API/deletion/action/$DEL_REQ_ID -H "Authorization: Bearer $EDITOR_TOKEN" -H 'Content-Type: application/json' -d '{"action":"APPROVED"}')
assert_eq "$(echo "$D1" | jq -r '.data.status')" "PENDING" "still pending after 1/3"
assert_eq "$(echo "$D1" | jq -r '.data.documentDeleted')" "false" "not deleted after 1/3"

echo "== 26. 2nd approve (reviewer) - still pending =="
D2=$(curl -s -X POST $API/deletion/action/$DEL_REQ_ID -H "Authorization: Bearer $REVIEWER_TOKEN" -H 'Content-Type: application/json' -d '{"action":"APPROVED"}')
assert_eq "$(echo "$D2" | jq -r '.data.status')" "PENDING" "still pending after 2/3"

echo "== 27. Document still live after 2/3 =="
FEED_2OF3=$(curl -s $API/live/feed -H "Authorization: Bearer $REVIEWER_TOKEN" | jq --arg id "$DOC_ID" '.data | map(select(.documentId == ($id | tonumber))) | length')
assert_eq "$FEED_2OF3" "1" "still live after 2/3 approvals"

echo "== 28. 3rd approve (publisher) - cascades delete =="
D3=$(curl -s -X POST $API/deletion/action/$DEL_REQ_ID -H "Authorization: Bearer $PUBLISHER_TOKEN" -H 'Content-Type: application/json' -d '{"action":"APPROVED"}')
assert_eq "$(echo "$D3" | jq -r '.data.status')" "APPROVED" "resolved APPROVED after 3/3"
assert_eq "$(echo "$D3" | jq -r '.data.documentDeleted')" "true" "documentDeleted true on the 3rd approval"

echo "== 29. Gone from Home feed =="
FEED_GONE=$(curl -s $API/live/feed -H "Authorization: Bearer $REVIEWER_TOKEN" | jq --arg id "$DOC_ID" '.data | map(select(.documentId == ($id | tonumber))) | length')
assert_eq "$FEED_GONE" "0" "removed from Home feed after cascade delete"

echo ""
echo "=================================="
echo "ALL 29 SMOKE-TEST CHECKS PASSED"
echo "=================================="
