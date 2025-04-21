import { DetailedHTMLProps, HTMLAttributes } from "react";

export type SpinnerProps = {
  containerProps?: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
};

const Spinner = ({ containerProps: { style: containerStyle, ...remainingContainerProps } = {} }: SpinnerProps) => {
  return (
    <div
      className="animate-spin"
      style={{
        ...containerStyle,
      }}
      {...remainingContainerProps}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="loading-spinner"
      >
        <title>Loading</title>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>
  );
};

export default Spinner;
