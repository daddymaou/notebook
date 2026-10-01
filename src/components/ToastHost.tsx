import { useCallback, useEffect, useRef, useState } from "react";
import { setToastListener } from "@/lib/toast";

type Phase = "hidden" | "in" | "hold" | "out";

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("hidden");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => {
    setToastListener((msg: string) => {
      clearTimers();
      setMessage(msg);
      setPhase("in");
      timers.current.push(setTimeout(() => setPhase("hold"), 200));
      timers.current.push(setTimeout(() => setPhase("out"), 4200));
      timers.current.push(
        setTimeout(() => {
          setPhase("hidden");
          setMessage(null);
        }, 4400),
      );
    });
    return () => {
      setToastListener(null);
      clearTimers();
    };
  }, [clearTimers]);

  if (message === null || phase === "hidden") return null;

  return (
    <div className={`toast ${phase === "out" ? "toast-out" : ""}`}>{message}</div>
  );
}
