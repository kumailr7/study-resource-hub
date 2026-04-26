"use client";

import { useEffect, useState } from "react";

interface DeviceSelectorProps {
  kind: "audioinput" | "videoinput";
  label: string;
  value: string;
  onChange: (deviceId: string) => void;
}

export function DeviceSelector({ kind, label, value, onChange }: DeviceSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    async function loadDevices() {
      // Request permission first so device labels are available
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          kind === "audioinput" ? { audio: true } : { video: true }
        );
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        // Permission denied — devices will show without labels
      }

      const all = await navigator.mediaDevices.enumerateDevices();
      const filtered = all.filter((d) => d.kind === kind);
      setDevices(filtered);

      if (filtered.length > 0 && !value) {
        onChange(filtered[0].deviceId);
      }
    }

    loadDevices();
  }, [kind]);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-dim uppercase tracking-wider">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="device-select w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all appearance-none cursor-pointer"
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `${kind === "audioinput" ? "Microphone" : "Camera"} ${device.deviceId.slice(0, 8)}`}
          </option>
        ))}
      </select>
    </div>
  );
}
