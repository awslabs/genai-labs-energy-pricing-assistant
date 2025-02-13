// stations-page.d.ts
import React from "react";

interface StationsPageProps {
    wsUrl: string;
    idToken: string;
}

declare const Stations: React.FC<StationsPageProps>;

export default Stations;
