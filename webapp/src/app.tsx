import { HashRouter, BrowserRouter, Routes, Route } from "react-router-dom";
import { USE_BROWSER_ROUTER } from "./common/constants";
import GlobalHeader from "./components/global-header";
import NotFound from "./pages/not-found";
import ChatPage from "./pages/chat-page";
import "./styles/app.scss";
import { Amplify} from 'aws-amplify';

import '@aws-amplify/ui-react/styles.css';
import Stations from "./pages/stations/stations-page.jsx";
import StationDetail from "./pages/stationdetail/stationdetail-page"
import { Authenticator } from '@aws-amplify/ui-react';
import { Hub } from 'aws-amplify/utils';

import {fetchAuthSession } from "aws-amplify/auth";
import { useEffect, useState } from "react";


const config = await fetch('./config.json').then((response) => response.json());

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolClientId: config.user_pools_web_client_id,
      userPoolId: config.user_pools_id,
      loginWith: {
        email: true,
      },
    }
  }
});

Hub.listen('auth', (data) => {
  console.log(data)
});

const App = () => {
  const Router = USE_BROWSER_ROUTER ? BrowserRouter : HashRouter;
  const [idToken, setIdToken] = useState<string | undefined>(undefined);
  const [proceed, setProceed] = useState(false);

  useEffect(() => {
    fetchAuthSession()
      .then(async (authSession) => {
        while (!authSession.tokens) {

          function timeout(delay: number) {
            return new Promise((res) => setTimeout(res, delay));
          }

          await timeout(1000);
          authSession = await fetchAuthSession();
        };
        setIdToken(authSession.tokens?.idToken?.toString());
      })
      .catch((error) => {
        console.error("Error fetching auth session:", error);
      });
  }, []);

  return (
    <Authenticator>
      {({ signOut, user }) => {
      return (
        <div style={{ height: "100%" }}>     
          {idToken && (
        <Router>
          <GlobalHeader />
          <div style={{ height: "56px", backgroundColor: "#000716" }}>&nbsp;</div>
          <div>
            <Routes>
              <Route path="/stationdetail" element={<StationDetail wsUrl={config.websocket_url} idToken={idToken} station=''/>} />
              <Route index path="/" element={<Stations  wsUrl={config.websocket_url} idToken={idToken} />} />
              <Route path="/chat" element={<ChatPage wsUrl={config.websocket_url} idToken={idToken}/>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Router>
          )}
      </div>
      )}
    }
    </Authenticator>   
  );
};

export default App;
