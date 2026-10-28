import { NextResponse } from "next/server";
import { phoneLoginEnabled } from "@/lib/sms";

export const dynamic = "force-dynamic";

/** Which ways of logging in this deployment offers. */
export async function GET() {
  return NextResponse.json({ email: true, phone: phoneLoginEnabled() });
}
