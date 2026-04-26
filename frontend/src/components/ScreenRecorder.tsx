import { useState } from "react";
import { Recorder } from "./Recorder";
import { PasswordGate } from "./PasswordGate";

interface ScreenRecorderPageProps {
  onAuthenticated?: (password: string) => void;
}

export default function ScreenRecorderPage({ onAuthenticated }: ScreenRecorderPageProps) {
  const [password, setPassword] = useState<string | null>(null);

  function handleAuthenticated(pw: string) {
    setPassword(pw);
    onAuthenticated?.(pw);
  }

  if (!password) {
    return <PasswordGate onAuthenticated={handleAuthenticated} />;
  }

  return <Recorder password={password} />;
}