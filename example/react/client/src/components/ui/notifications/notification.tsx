import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/utils/cn";

const icons = {
  info: <Info className="size-6 text-blue-500" aria-hidden="true" />,
  success: <CircleCheck className="size-6 text-green-500" aria-hidden="true" />,
  warning: <CircleAlert className="size-6 text-yellow-500" aria-hidden="true" />,
  error: <CircleAlert className="size-6 text-red-500" aria-hidden="true" />,
};

export type NotificationProps = {
  notification: {
    id: string;
    type: keyof typeof icons;
    title: string;
    message?: string;
    duration?: number;
  };
  onDismiss: (id: string) => void;
};

const clearRefTimeout = (ref: RefObject<number | null>) => {
  if (typeof ref.current === "number") {
    clearTimeout(ref.current);
    ref.current = null;
  }
};

// TODO: uplift the auto dismissal to the store so only the oldest notification
// is dismissed each duration
export const Notification = ({
  notification: { id, type, title, message, duration = 5000 },
  onDismiss,
}: NotificationProps) => {
  const [isExiting, setExiting] = useState(false);
  // Timer to track the auto dismissal
  const dismissalTimerRef = useRef<number | null>(null);
  // Timer to track the exit animation
  const exitTimeoutRef = useRef<number | null>(null);

  const startExit = useCallback(() => {
    if (isExiting) return;

    setExiting(true);

    exitTimeoutRef.current = setTimeout(() => {
      onDismiss(id);
    }, 500);
  }, [isExiting, onDismiss, id]);

  const pauseAutoDismissal = useCallback(() => {
    if (isExiting) return;
    clearRefTimeout(dismissalTimerRef);
  }, [isExiting]);

  const startAutoDismissal = useCallback(() => {
    if (isExiting) return;
    clearRefTimeout(dismissalTimerRef);
    dismissalTimerRef.current = setTimeout(startExit, duration);
  }, [duration, isExiting, startExit]);

  useEffect(() => {
    startAutoDismissal();

    return () => {
      clearRefTimeout(dismissalTimerRef);
    };
  }, [startAutoDismissal]);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center space-y-4 sm:items-end transition-all duration-500",
        isExiting ? "opacity-0 translate-x-4" : "opacity-100",
      )}
      onMouseEnter={pauseAutoDismissal}
      onMouseLeave={startAutoDismissal}
      onFocus={pauseAutoDismissal}
      onBlur={startAutoDismissal}
    >
      <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5">
        <div className="p-4" role="alert" aria-label={title}>
          <div className="flex items-start">
            <div className="shrink-0">{icons[type]}</div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  "text-sm font-medium text-gray-900 dark:text-white",
                  type === "error" && "text-red-500 dark:text-red-400",
                )}
              >
                {title}
              </p>
              <p className="mt-1 text-sm">{message}</p>
            </div>
            <div className="ml-4 flex shrink-0">
              <button
                type="button"
                className="inline-flex cursor-pointer rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                onClick={() => {
                  startExit();
                }}
              >
                <span className="sr-only">Close</span>
                <CircleX className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
