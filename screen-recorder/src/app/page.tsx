"use client";

import { useState } from "react";
import { PasswordGate } from "@/components/password-gate";
import { Recorder } from "@/components/recorder";

export default function Home() {
  const [password, setPassword] = useState<string | null>(null);

  if (!password) {
    return <PasswordGate onAuthenticated={setPassword} />;
  }

  return <Recorder password={password} />;
}
