import { ReactNode } from "react";

export function ErrorBox(props: { children: ReactNode }) {
  return <div className="error-box">{props.children}</div>;
}
