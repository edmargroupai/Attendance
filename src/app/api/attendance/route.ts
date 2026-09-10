import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";

export type AttendanceUpdate = {
  enrolmentId: string;
  calendarSessionId: string;
  status: "P" | "A" | "L" | "Ex" | null;
  expectedRevision: number;
};

function hashPayload(updates: AttendanceUpdate[]): string {
  return createHash("sha256").update(JSON.stringify(updates)).digest("hex");
}

// Spec section 7 command contract for "Update marks": requestId + up to
// 100 {enrolmentId,sessionId,status,expectedRevision}; atomic success or
// conflict. All the actual atomicity/revision/idempotency logic lives in
// the update_attendance_batch Postgres function (Stage-6 migration) -
// this route just validates shape, hashes the payload, and translates
// the function's structured result into the right HTTP status.
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return errorResponse("Not authenticated", 401);

  const body = await request.json();
  const { requestId, updates } = body ?? {};

  if (!requestId || typeof requestId !== "string") {
    return errorResponse("requestId is required");
  }
  if (!Array.isArray(updates) || updates.length === 0) {
    return errorResponse("updates[] is required and must not be empty");
  }
  if (updates.length > 100) {
    return errorResponse("cannot update more than 100 cells in a single request");
  }

  for (const u of updates as AttendanceUpdate[]) {
    if (!u.enrolmentId || !u.calendarSessionId || typeof u.expectedRevision !== "number") {
      return errorResponse("each update requires enrolmentId, calendarSessionId, and expectedRevision");
    }
  }

  const payloadHash = hashPayload(updates);

  const { data, error } = await auth.supabase.rpc("update_attendance_batch", {
    p_request_id: requestId,
    p_payload_hash: payloadHash,
    p_updates: updates,
  });

  if (error) return errorResponse(error.message, 400);

  const result = data as { status: "ok" | "conflict"; updates?: unknown; conflicts?: unknown };

  if (result.status === "conflict") {
    return NextResponse.json(result, { status: 409 });
  }

  return NextResponse.json(result);
}
