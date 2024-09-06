import { ReactNode } from "react";
import { css } from "@emotion/react";
import { borderRadius } from "../util/theme";

export function ErrorBox(props: { children: ReactNode }) {
  return (
    <div
      css={css`
        text-align: center;
        padding: 10px;
        background-color: var(--error);
        font-weight: bold;
        color: var(--foreground);
        border-radius: ${borderRadius};
      `}
    >
      {props.children}
    </div>
  );
}
