import { useNotifications } from "@/components/ui/notifications/notifications-store";

import { useResetCounter } from "../api/reset-counter";

type ResetCounterButtonProps = {
  withCsrf?: boolean;
};

function ResetCounterButton({ withCsrf }: ResetCounterButtonProps = { withCsrf: true }) {
  const { addNotification } = useNotifications();
  const resetCounter = useResetCounter({
    mutationConfig: {
      onError(error) {
        addNotification({
          type: "error",
          title: "Failed to increment Counter",
          message: error.message,
        });
      },
    },
  });

  // Button styling is from Flowbite: https://flowbite.com/docs/components/buttons/
  return (
    <button
      type="button"
      className="cursor-pointer relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800"
      onClick={() => resetCounter.mutate(withCsrf)}
    >
      <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
        Reset Counter
      </span>
    </button>
  );
}

export default ResetCounterButton;
