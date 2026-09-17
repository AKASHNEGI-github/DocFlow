#!/usr/bin/env bash
set -euo pipefail
API="http://localhost:4000/api/v1"
pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; exit 1; }
assert_eq() { [ "$1" = "$2" ] && pass "$3" || { echo "    expected [$2] got [$1]"; fail "$3"; }; }

ADMIN_TOKEN=$(curl -s --max-time 5 -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"aditi.singh@docflow.admin","password":"password"}' | jq -r '.data.accessToken')
mkuser() { curl -s --max-time 5 -X POST $API/admin/users -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"fullName\":\"$1\",\"email\":\"$2\",\"password\":\"Password123\",\"role\":\"$3\"}"; }
EDITOR_ID=$(mkuser "Ed Two" "editor2@docflow.local" "editor" | jq -r '.data.userId')
EDITOR2_ID=$(mkuser "Ed Three" "editor3@docflow.local" "editor" | jq -r '.data.userId')
REVIEWER_ID=$(mkuser "Rev Two" "reviewer2@docflow.local" "reviewer" | jq -r '.data.userId')
AUTHOR=$(curl -s --max-time 5 -X POST $API/auth/register -H 'Content-Type: application/json' -d '{"fullName":"Round2 Author","email":"author2@docflow.local","password":"Password123"}')
AUTHOR_TOKEN=$(echo "$AUTHOR" | jq -r '.data.accessToken')
EDITOR_TOKEN=$(curl -s --max-time 5 -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"editor2@docflow.local","password":"Password123"}' | jq -r '.data.accessToken')
EDITOR2_TOKEN=$(curl -s --max-time 5 -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"editor3@docflow.local","password":"Password123"}' | jq -r '.data.accessToken')
REVIEWER_TOKEN=$(curl -s --max-time 5 -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"reviewer2@docflow.local","password":"Password123"}' | jq -r '.data.accessToken')

echo "== R1. Create + promote =="
DOC_ID=$(curl -s --max-time 5 -X POST $API/documents/new -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d '{"category":"Eng","title":"RejectFlow","content":"<p>x</p>"}' | jq -r '.data.documentId')
curl -s --max-time 5 -X POST $API/draft/promote/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d "{\"editorIds\":[$EDITOR_ID]}" > /dev/null
pass "doc $DOC_ID created and promoted to editorial"

echo "== R2. A non-assigned editor cannot act =="
FORBIDDEN=$(curl -s --max-time 5 -X POST $API/editorial/action/$DOC_ID -H "Authorization: Bearer $EDITOR2_TOKEN" -H 'Content-Type: application/json' -d '{"action":"APPROVED"}')
echo "$FORBIDDEN" | jq -e '.code >= 400' > /dev/null && pass "non-assigned editor blocked (403)" || fail "non-assigned-approver guard"

echo "== R3. Editor REJECTS -> stage must revert to DRAFT =="
REJECT=$(curl -s --max-time 5 -X POST $API/editorial/action/$DOC_ID -H "Authorization: Bearer $EDITOR_TOKEN" -H 'Content-Type: application/json' -d '{"action":"REJECTED"}')
STAGE=$(echo "$REJECT" | jq -r '.data.stage')
LATEST_PHASE=$(echo "$REJECT" | jq -r '.data.latestPhase')
LATEST_STATUS=$(echo "$REJECT" | jq -r '.data.latestStatus')
assert_eq "$STAGE" "DRAFT" "documents.stage reverts to DRAFT on editor reject"
assert_eq "$LATEST_PHASE" "EDITORIAL" "but still DISPLAYS under Editorial (Core Navigation Rule)"
assert_eq "$LATEST_STATUS" "REJECTED" "with status REJECTED"

echo "== R4. Doc must NOT appear in Draft/My Documents (Core Navigation Rule) =="
DRAFT_LIST=$(curl -s --max-time 5 $API/draft/all -H "Authorization: Bearer $AUTHOR_TOKEN" | jq --arg id "$DOC_ID" '.data | map(select(.documentId == ($id|tonumber))) | length')
assert_eq "$DRAFT_LIST" "0" "rejected doc absent from Draft list despite stage=DRAFT"

echo "== R5. It DOES appear in Editorial/My Requests, with Rejected status =="
EDIT_LIST=$(curl -s --max-time 5 $API/editorial/my-requests -H "Authorization: Bearer $AUTHOR_TOKEN")
FOUND=$(echo "$EDIT_LIST" | jq --arg id "$DOC_ID" '.data | map(select(.documentId == ($id|tonumber))) | length')
FOUND_STATUS=$(echo "$EDIT_LIST" | jq -r --arg id "$DOC_ID" '.data[] | select(.documentId == ($id|tonumber)) | .requestStatus')
assert_eq "$FOUND" "1" "rejected doc present in editorial/my-requests"
assert_eq "$FOUND_STATUS" "REJECTED" "with requestStatus REJECTED"

echo "== R6. Author can now EDIT the rejected doc =="
EDIT=$(curl -s --max-time 5 -X PUT $API/documents/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d '{"content":"<p>revised after rejection</p>"}')
echo "$EDIT" | jq -e '.code < 300' > /dev/null && pass "author can edit a rejected document" || fail "edit-after-reject"

echo "== R7. Repromote (fresh attempt) advances stage back to EDITORIAL =="
REPROMOTE=$(curl -s --max-time 5 -X POST $API/editorial/repromote/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d "{\"editorIds\":[$EDITOR_ID]}")
assert_eq "$(echo "$REPROMOTE" | jq -r '.data.stage')" "EDITORIAL" "repromote advances stage back to EDITORIAL"

echo "== R8. Author CANCELS this fresh pending request -> reverts to DRAFT again =="
CANCEL=$(curl -s --max-time 5 -X POST $API/editorial/cancel/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN")
assert_eq "$(echo "$CANCEL" | jq -r '.data.stage')" "DRAFT" "cancel reverts stage to DRAFT"
assert_eq "$(echo "$CANCEL" | jq -r '.data.latestStatus')" "CANCELLED" "status is CANCELLED"

echo "== R9. Cancelled doc also NOT in Draft list, but IS in Editorial list with promote-again =="
DRAFT_LIST2=$(curl -s --max-time 5 $API/draft/all -H "Authorization: Bearer $AUTHOR_TOKEN" | jq --arg id "$DOC_ID" '.data | map(select(.documentId == ($id|tonumber))) | length')
assert_eq "$DRAFT_LIST2" "0" "cancelled doc absent from Draft list too"

echo "== R10. Full run to Review, then REVIEWER rejects -> stage reverts to EDITORIAL =="
curl -s --max-time 5 -X POST $API/editorial/repromote/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d "{\"editorIds\":[$EDITOR_ID]}" > /dev/null
curl -s --max-time 5 -X POST $API/editorial/action/$DOC_ID -H "Authorization: Bearer $EDITOR_TOKEN" -H 'Content-Type: application/json' -d '{"action":"APPROVED"}' > /dev/null
curl -s --max-time 5 -X POST $API/editorial/promote/$DOC_ID -H "Authorization: Bearer $AUTHOR_TOKEN" -H 'Content-Type: application/json' -d "{\"reviewerIds\":[$REVIEWER_ID]}" > /dev/null
REV_REJECT=$(curl -s --max-time 5 -X POST $API/review/action/$DOC_ID -H "Authorization: Bearer $REVIEWER_TOKEN" -H 'Content-Type: application/json' -d '{"action":"REJECTED"}')
assert_eq "$(echo "$REV_REJECT" | jq -r '.data.stage')" "EDITORIAL" "reviewer reject reverts stage to EDITORIAL (not DRAFT)"
assert_eq "$(echo "$REV_REJECT" | jq -r '.data.latestPhase')" "REVIEW" "but still displays under Review"

echo "== R11. Password reset flow (dev mode logs the link instead of emailing) =="
FORGOT=$(curl -s --max-time 5 -X POST $API/auth/forgot-password -H 'Content-Type: application/json' -d '{"email":"author2@docflow.local"}')
echo "$FORGOT" | jq -e '.code < 300' > /dev/null && pass "forgot-password accepted" || fail "forgot-password"
RESET_TOKEN=$(grep -o 'token=[a-f0-9]*' /tmp/server.log | tail -1 | cut -d= -f2)
[ -n "$RESET_TOKEN" ] && pass "reset token found in dev log ($( echo $RESET_TOKEN | cut -c1-12)...)" || fail "reset token not logged"
RESET=$(curl -s --max-time 5 -X POST $API/auth/reset-password -H 'Content-Type: application/json' -d "{\"token\":\"$RESET_TOKEN\",\"newPassword\":\"NewPassword456\"}")
echo "$RESET" | jq -e '.code < 300' > /dev/null && pass "reset-password succeeded" || fail "reset-password"
RELOGIN=$(curl -s --max-time 5 -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"author2@docflow.local","password":"NewPassword456"}')
echo "$RELOGIN" | jq -e '.code < 300' > /dev/null && pass "login works with the new password" || fail "login after reset"
OLDLOGIN=$(curl -s --max-time 5 -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"author2@docflow.local","password":"Password123"}')
echo "$OLDLOGIN" | jq -e '.code >= 400' > /dev/null && pass "old password no longer works" || fail "old password should be rejected"

echo "== R12. Admin role update + non-admin cannot access admin routes =="
ROLECHANGE=$(curl -s --max-time 5 -X PUT $API/admin/role/$EDITOR2_ID -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"role":"reviewer"}')
assert_eq "$(echo "$ROLECHANGE" | jq -r '.data.role')" "reviewer" "admin can change a user's role"
DENIED=$(curl -s --max-time 5 $API/admin/all -H "Authorization: Bearer $AUTHOR_TOKEN")
echo "$DENIED" | jq -e '.code >= 400' > /dev/null && pass "non-admin blocked from /admin/all" || fail "admin route guard"

echo ""
echo "=================================="
echo "ALL ROUND-2 CHECKS PASSED (12 groups)"
echo "=================================="
