import { useNotifications } from "@/components/ui/notifications/notifications-store";

import { useIncrementCounter } from "../api/increment-counter";

type IncrementCounterButtonProps = {
  withCsrf?: boolean;
};

function IncrementCounterButton({ withCsrf }: IncrementCounterButtonProps = { withCsrf: true }) {
  const { addNotification } = useNotifications();
  const incrementCounter = useIncrementCounter({
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
      className="cursor-pointer relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-green-400 to-blue-600 group-hover:from-green-400 group-hover:to-blue-600 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800"
      onClick={() => incrementCounter.mutate(withCsrf)}
    >
      <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
        Increment Counter
      </span>
    </button>
  );
}

export default IncrementCounterButton;
