import type { Subject } from "../contract/types";

export type ParsedSubject = { kind: "user"; userId: string } | { kind: "device"; deviceId: string };

export function parseSubject(input: Subject): ParsedSubject {
  const userId = "userId" in input ? input.userId : undefined;
  const deviceId = "deviceId" in input ? input.deviceId : undefined;
  const hasUser = typeof userId === "string" && userId.length > 0;
  const hasDevice = typeof deviceId === "string" && deviceId.length > 0;
  if (hasUser && !hasDevice) return { kind: "user", userId };
  if (hasDevice && !hasUser) return { kind: "device", deviceId };
  throw new Error("Subject needs a userId or a deviceId, and not both");
}
