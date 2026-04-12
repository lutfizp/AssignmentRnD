import { getClientIp } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { HealthCheckResponse } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const data = HealthCheckResponse.parse({ status: "ok" });
  return NextResponse.json(data);
}
