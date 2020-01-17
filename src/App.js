import React from "react";
import { Layout, MobileContainer } from './components/Layout'

function App({ children }) {
  return (
    <Layout>
      <MobileContainer>
        {children}
      </MobileContainer>
    </Layout>
  );
}

export default App;