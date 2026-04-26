import { useState } from "react";
import { Recorder } from "./Recorder";

export default function ScreenRecorderPage() {
  const [password, setPassword] = useState<string>("");

  return <Recorder password={password} />;
}