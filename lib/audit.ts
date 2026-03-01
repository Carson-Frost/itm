import { getAdminFirestore } from "./firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

type AuditSeverity = "low" | "medium" | "high"

interface AuditParams {
  adminUid: string
  adminEmail: string
  action: string
  resource: string
  before?: unknown
  after?: unknown
  ip?: string
  severity?: AuditSeverity
}

// Map action prefixes to severity levels
function inferSeverity(action: string): AuditSeverity {
  const upper = action.toUpperCase()
  if (upper.startsWith("DELETE") || upper.startsWith("DISABLE")) return "high"
  if (upper.startsWith("UPDATE") || upper.startsWith("EDIT") || upper.startsWith("ENABLE") || upper.startsWith("REVERT")) return "medium"
  return "low"
}

export async function logAudit(params: AuditParams) {
  const db = getAdminFirestore()
  const severity = params.severity || inferSeverity(params.action)

  await db.collection("audit_log").add({
    adminUid: params.adminUid,
    adminEmail: params.adminEmail,
    action: params.action,
    resource: params.resource,
    before: params.before ?? null,
    after: params.after ?? null,
    ip: params.ip ?? null,
    severity,
    timestamp: FieldValue.serverTimestamp(),
  })
}
