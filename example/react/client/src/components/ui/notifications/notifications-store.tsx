import { nanoid } from "nanoid";
import { create } from "zustand";

export type Notification = {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  message?: string;
};

type NotificationsStore = {
  notifications: Notification[];
  enabled: boolean;
  addNotification: (notification: Omit<Notification, "id">) => void;
  dismissNotification: (id: string) => void;
};

export const useNotifications = create<NotificationsStore>((set, get) => ({
  notifications: [],
  enabled: true,
  addNotification: (notification) => {
    if (get().enabled) {
      set((state) => ({
        enabled: state.enabled,
        notifications: [...state.notifications, { id: nanoid(), ...notification }],
      }));
    }
  },
  disableNotifications: () => set((state) => ({ ...state, enabled: false })),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),
  enableNotifications: () => set((state) => ({ ...state, enabled: true })),
}));
