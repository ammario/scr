import { NextPage, NextPageContext } from "next";

interface ErrorProps {
  statusCode: number;
}

const Error: NextPage<ErrorProps> = ({ statusCode }) => {
  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>{statusCode}</h1>
      <p>
        {statusCode === 404
          ? "This page could not be found."
          : "An error occurred on the server."}
      </p>
      <a href="/" style={{ color: "#7c93d3" }}>
        Go back home
      </a>
    </div>
  );
};

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode: statusCode ?? 500 };
};

export default Error;
