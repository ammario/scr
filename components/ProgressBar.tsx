import { css, keyframes } from "@emotion/react";
import { colors } from "../util/theme";

const indeterminateAnimation = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

// progress is a number between 0 and 1
export default function ProgressBar({ progress }: { progress: number }) {
  return (
    <div
      css={css`
        width: 100%;
        height: 10px;
        background-color: ${colors.accentDark};
        border-radius: 4px;
        margin: 10px 0;
        overflow: hidden;
      `}
    >
      <div
        css={css`
          width: ${progress !== 0 ? `${progress * 100}%` : "30%"};
          height: 100%;
          background-color: ${colors.accent};
          transition: width 0.3s ease-in-out;
          ${progress === 0 &&
          css`
            animation: ${indeterminateAnimation} 3s infinite linear;
          `}
        `}
      />
    </div>
  );
}
