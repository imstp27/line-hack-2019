import styled from 'styled-components';

export const Layout = styled.div`
  display: flex;
  justify-content: center;
`;

export const MobileContainer = styled.div`
  width: 100vw;
  min-height: 100vh;
  max-width: 425px;
  background: white;
  box-shadow: 0 8px 60px 0 rgba(103,151,255,.11), 0 12px 90px 0 rgba(103,151,255,.11);
`;

export const Content = styled.div`
  padding: 0 1rem;
  margin: 1rem 0 0 0;
  position: relative;
  min-height: calc(100vh - 1rem);

`;