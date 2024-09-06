import styled from "@emotion/styled";

export const FlexColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  max-width: 800px;
  width: 100%; // Add this line
  box-sizing: border-box; // Add this line
`;
